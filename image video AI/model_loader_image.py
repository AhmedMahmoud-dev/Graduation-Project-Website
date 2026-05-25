# model_loader_image.py
"""
IMAGE / VIDEO EMOTION DETECTION  —  v1.2 Fast Pipeline
=======================================================
Key performance changes over v1.1:
  - Face detection: RetinaFace  →  OpenCV DNN (res10 SSD)
      RetinaFace launches a TensorFlow graph per call (~5–8 s/frame on CPU).
      OpenCV DNN runs a lightweight SSD in pure C++ (~0.05–0.1 s/frame).
  - True parallelism: ThreadPoolExecutor → multiprocessing.ProcessPoolExecutor
      Python's GIL blocks threads from running CPU inference in parallel.
      Processes have separate GIL instances — real parallel execution.
  - Input resolution: MAX_FRAME_DIM 1280 → 640
      Face detection doesn't need 1280px; 640px is sufficient and 4× faster.
  - Frame-diff skipping: frames that are visually very similar to the
      previous sampled frame are skipped entirely (saves inference on static shots).

Pipeline stages (image):
  1. Load & validate frame  (quality flags, resize)
  2. OpenCV DNN SSD → detect ALL faces
  3. Align + crop each face
  4. HSEmotion enet_b0_8_best_vgaf → 8-class probs per face
  5. Confidence gating
  6. Assemble per-face result + scene-level aggregation

Pipeline stages (video):
  1–5 above, applied in parallel processes across sampled frames
  6. DeepSORT tracking (sequential — stateful)
  7. Bidirectional EMA temporal smoothing per face track
  8. Timeline + transition detection per face track
  9. Scene-level aggregation
 10. Assemble output

All outputs are native Python floats/ints — safe for FastAPI JSON serialization.
"""

# ── Standard library ────────────────────────────────────────────────────────
import logging
import os
import time
import urllib.request
from concurrent.futures import ProcessPoolExecutor, as_completed
from datetime import datetime
from pathlib import Path
from typing import Optional

# ── Third-party ─────────────────────────────────────────────────────────────
import cv2
import numpy as np
from hsemotion_onnx.facial_emotions import HSEmotionRecognizer

# DeepSORT — video only
try:
    from deep_sort_realtime.deepsort_tracker import DeepSort
    _DEEPSORT_AVAILABLE = True
except ImportError:
    _DEEPSORT_AVAILABLE = False

# ── Logging ─────────────────────────────────────────────────────────────────
log = logging.getLogger("image_emotion")
log.setLevel(logging.INFO)
if not log.handlers:
    _h = logging.StreamHandler()
    _h.setFormatter(logging.Formatter(
        "%(asctime)s  %(levelname)-8s  %(name)s  %(message)s",
        datefmt="%H:%M:%S",
    ))
    log.addHandler(_h)

# ═════════════════════════════════════════════════════════════════════════════
#  CONFIGURATION
# ═════════════════════════════════════════════════════════════════════════════

EMOTION_MODEL_NAME  = "enet_b0_8_best_vgaf"
FACE_DETECT_THRESH  = 0.75          # SSD confidence threshold
CONFIDENCE_GATE     = 0.25
EMA_ALPHA_BASE      = 0.30
# Adaptive sampling — fps target scales with video duration:
#   < 5s   → 8 fps
#   5–15s  → 6 fps
#   15–60s → 4 fps
#   1–3min → 2 fps
#   > 3min → 1 fps
_FPS_TIERS = [
    (5,   4.0),
    (15,  3.0),
    (60,  2.0),
    (180, 1.0),
]
_FPS_FLOOR = 0.5


def _adaptive_fps_target(duration_sec: float) -> float:
    for threshold, fps in _FPS_TIERS:
        if duration_sec < threshold:
            return fps
    return _FPS_FLOOR


MAX_FRAME_DIM       = 640           # face detection doesn't need more than 640px
FRAME_DIFF_SKIP     = 0.985         # skip only if >98.5% similar — much less aggressive
SSD_INPUT_SIZE      = (300, 300)    # OpenCV DNN SSD fixed input size

# ── Parallelism ──────────────────────────────────────────────────────────────
# Processes bypass the GIL for true CPU parallelism.
# Each worker loads its own HSEmotion model (~80 MB RAM each).
VIDEO_WORKER_PROCS = max(1, min(4, (os.cpu_count() or 2) - 1))

# ── Label system ─────────────────────────────────────────────────────────────
FUSION_LABELS = ["anger", "contempt", "disgust", "fear", "happiness", "neutral", "sadness", "surprise"]
NUM_CLASSES   = len(FUSION_LABELS)
_FUSION_INDEX = {label: i for i, label in enumerate(FUSION_LABELS)}

EMOTION_CATEGORY = {
    "anger":     "negative",
    "contempt":  "negative",
    "disgust":   "negative",
    "fear":      "negative",
    "sadness":   "negative",
    "happiness": "positive",
    "surprise":  "positive",
    "neutral":   "neutral",
}

# ═════════════════════════════════════════════════════════════════════════════
#  OPENCV DNN FACE DETECTOR  —  res10_300x300_ssd_iter_140000
#  Shipped with OpenCV — no extra install needed.
# ═════════════════════════════════════════════════════════════════════════════

_MODEL_DIR    = Path(__file__).parent / "face_detector_weights"
_PROTO_URL    = "https://raw.githubusercontent.com/opencv/opencv/master/samples/dnn/face_detector/deploy.prototxt"
_WEIGHTS_URL  = "https://github.com/opencv/opencv_3rdparty/raw/dnn_samples_face_detector_20170830/res10_300x300_ssd_iter_140000.caffemodel"
_PROTO_PATH   = _MODEL_DIR / "deploy.prototxt"
_WEIGHTS_PATH = _MODEL_DIR / "res10_300x300_ssd_iter_140000.caffemodel"


def _ensure_dnn_weights() -> None:
    """Download OpenCV SSD face detector weights if not already cached."""
    _MODEL_DIR.mkdir(parents=True, exist_ok=True)
    if not _PROTO_PATH.exists():
        log.info("Downloading face detector prototxt …")
        urllib.request.urlretrieve(_PROTO_URL, _PROTO_PATH)
    if not _WEIGHTS_PATH.exists():
        log.info("Downloading face detector caffemodel (~2.7 MB) …")
        urllib.request.urlretrieve(_WEIGHTS_URL, _WEIGHTS_PATH)


def _load_dnn_detector():
    """Load and return the OpenCV DNN face detector."""
    _ensure_dnn_weights()
    net = cv2.dnn.readNetFromCaffe(str(_PROTO_PATH), str(_WEIGHTS_PATH))
    net.setPreferableBackend(cv2.dnn.DNN_BACKEND_OPENCV)
    net.setPreferableTarget(cv2.dnn.DNN_TARGET_CPU)
    return net


# Module-level detector — loaded once in the main process
log.info("Loading OpenCV DNN face detector …")
_ensure_dnn_weights()
_dnn_net = _load_dnn_detector()
log.info("Face detector ready.")

log.info("Loading HSEmotion model '%s' …", EMOTION_MODEL_NAME)
_emotion_recognizer = HSEmotionRecognizer(model_name=EMOTION_MODEL_NAME)
log.info("HSEmotion loaded.")


# ═════════════════════════════════════════════════════════════════════════════
#  UTILITY HELPERS
# ═════════════════════════════════════════════════════════════════════════════

def _uniform_probs(label: str = "neutral") -> list:
    v = [0.0] * NUM_CLASSES
    v[_FUSION_INDEX[label]] = 1.0
    return v


def _normalize_probs(probs: list) -> list:
    s = sum(probs)
    return [x / s for x in probs] if s > 0 else _uniform_probs("neutral")


def _dominant(probs: list) -> dict:
    idx = int(np.argmax(probs))
    return {
        "label":              FUSION_LABELS[idx],
        "confidence":         float(probs[idx]),
        "confidence_percent": round(float(probs[idx]) * 100, 2),
        "category":           EMOTION_CATEGORY[FUSION_LABELS[idx]],
    }


def _results_sorted(probs: list) -> list:
    return sorted(
        [
            {
                "label":              FUSION_LABELS[i],
                "confidence":         float(probs[i]),
                "confidence_percent": round(float(probs[i]) * 100, 2),
            }
            for i in range(NUM_CLASSES)
        ],
        key=lambda x: x["confidence"],
        reverse=True,
    )


def _shannon_entropy(probs: list) -> float:
    arr = np.array(probs, dtype=np.float64)
    arr = arr[arr > 0]
    return float(-np.sum(arr * np.log(arr)))


# ═════════════════════════════════════════════════════════════════════════════
#  FRAME PRE-PROCESSING
# ═════════════════════════════════════════════════════════════════════════════

def _load_frame(source) -> tuple:
    if isinstance(source, str):
        frame = cv2.imread(source)
        if frame is None:
            raise ValueError(f"Could not read image at path: {source}")
    elif isinstance(source, np.ndarray):
        frame = source.copy()
    else:
        raise TypeError("source must be a file path or a numpy BGR array")

    quality = {
        "original_width":  int(frame.shape[1]),
        "original_height": int(frame.shape[0]),
        "was_downscaled":  False,
    }

    h, w = frame.shape[:2]
    if max(h, w) > MAX_FRAME_DIM:
        scale = MAX_FRAME_DIM / max(h, w)
        frame = cv2.resize(frame, (int(w * scale), int(h * scale)), interpolation=cv2.INTER_AREA)
        quality["was_downscaled"] = True
        quality["downscaled_to"] = (int(frame.shape[1]), int(frame.shape[0]))

    return frame, quality


# ═════════════════════════════════════════════════════════════════════════════
#  FACE DETECTION  (OpenCV DNN — res10 SSD)
# ═════════════════════════════════════════════════════════════════════════════

def _detect_faces(frame_bgr: np.ndarray, net=None) -> list:
    """
    Run OpenCV DNN SSD face detector on a BGR frame.
    ~50–100ms on CPU vs ~5000–8000ms for RetinaFace.

    net: pass explicit net for worker processes; defaults to module-level _dnn_net.
    """
    if net is None:
        net = _dnn_net

    h, w = frame_bgr.shape[:2]
    blob = cv2.dnn.blobFromImage(
        frame_bgr, scalefactor=1.0, size=SSD_INPUT_SIZE,
        mean=(104.0, 177.0, 123.0), swapRB=False, crop=False,
    )
    net.setInput(blob)
    detections = net.forward()  # shape: (1, 1, N, 7)

    faces = []
    for i in range(detections.shape[2]):
        confidence = float(detections[0, 0, i, 2])
        if confidence < FACE_DETECT_THRESH:
            continue
        x1 = int(detections[0, 0, i, 3] * w)
        y1 = int(detections[0, 0, i, 4] * h)
        x2 = int(detections[0, 0, i, 5] * w)
        y2 = int(detections[0, 0, i, 6] * h)
        x1, y1 = max(0, x1), max(0, y1)
        x2, y2 = min(w - 1, x2), min(h - 1, y2)
        if x2 <= x1 or y2 <= y1:
            continue
        faces.append({"bbox": [x1, y1, x2, y2], "score": confidence})

    faces.sort(key=lambda f: f["bbox"][0])
    return faces


# ═════════════════════════════════════════════════════════════════════════════
#  FACE CROP
# ═════════════════════════════════════════════════════════════════════════════

def _align_and_crop(frame_bgr: np.ndarray, face_info: dict) -> Optional[np.ndarray]:
    """Padded RGB crop — consistent with v1.0/v1.1 behavior."""
    x1, y1, x2, y2 = face_info["bbox"]
    rgb = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2RGB)

    bw, bh = x2 - x1, y2 - y1
    pad_x, pad_y = int(bw * 0.15), int(bh * 0.25)
    cx1 = max(0, x1 - pad_x)
    cy1 = max(0, y1 - pad_y)
    cx2 = min(rgb.shape[1] - 1, x2 + pad_x)
    cy2 = min(rgb.shape[0] - 1, y2 + pad_y)

    crop = rgb[cy1:cy2, cx1:cx2]
    return crop if crop.size > 0 else None


# ═════════════════════════════════════════════════════════════════════════════
#  EMOTION INFERENCE
# ═════════════════════════════════════════════════════════════════════════════

def _infer_emotion(face_crop_rgb: np.ndarray, recognizer=None) -> list:
    if recognizer is None:
        recognizer = _emotion_recognizer
    _, hs_probs = recognizer.predict_emotions(face_crop_rgb, logits=False)
    probs8 = [float(hs_probs[i]) for i in range(NUM_CLASSES)]
    return _normalize_probs(probs8)


# ═════════════════════════════════════════════════════════════════════════════
#  CONFIDENCE GATING
# ═════════════════════════════════════════════════════════════════════════════

def _apply_confidence_gate(probs: list) -> tuple:
    if max(probs) < CONFIDENCE_GATE:
        gated = [0.0] * NUM_CLASSES
        gated[_FUSION_INDEX["neutral"]] = 0.7
        for i in range(NUM_CLASSES):
            gated[i] += probs[i] * 0.3
        return _normalize_probs(gated), True
    return probs, False


# ═════════════════════════════════════════════════════════════════════════════
#  FRAME SIMILARITY  (fast skip for static shots)
# ═════════════════════════════════════════════════════════════════════════════

def _frames_are_similar(a: np.ndarray, b: np.ndarray, threshold: float = FRAME_DIFF_SKIP) -> bool:
    """
    Cheap similarity check using downsampled mean absolute difference.
    Returns True if frames are near-identical (caller should skip b).
    """
    size = (80, 45)
    ga = cv2.resize(cv2.cvtColor(a, cv2.COLOR_BGR2GRAY), size)
    gb = cv2.resize(cv2.cvtColor(b, cv2.COLOR_BGR2GRAY), size)
    diff = np.mean(np.abs(ga.astype(np.float32) - gb.astype(np.float32))) / 255.0
    return (1.0 - diff) > threshold


# ═════════════════════════════════════════════════════════════════════════════
#  BIDIRECTIONAL EMA SMOOTHING
# ═════════════════════════════════════════════════════════════════════════════

def _smooth_bidirectional(raw_probs_list: list) -> list:
    n = len(raw_probs_list)
    if n == 0:
        return []
    if n == 1:
        return [raw_probs_list[0]]

    alpha = EMA_ALPHA_BASE
    fwd = [None] * n
    fwd[0] = list(raw_probs_list[0])
    for i in range(1, n):
        fwd[i] = [
            alpha * raw_probs_list[i][j] + (1.0 - alpha) * fwd[i - 1][j]
            for j in range(NUM_CLASSES)
        ]

    bwd = [None] * n
    bwd[-1] = list(raw_probs_list[-1])
    for i in range(n - 2, -1, -1):
        bwd[i] = [
            alpha * raw_probs_list[i][j] + (1.0 - alpha) * bwd[i + 1][j]
            for j in range(NUM_CLASSES)
        ]

    smoothed = []
    for i in range(n):
        avg = [(fwd[i][j] + bwd[i][j]) / 2.0 for j in range(NUM_CLASSES)]
        smoothed.append(_normalize_probs(avg))
    return smoothed


# ═════════════════════════════════════════════════════════════════════════════
#  TRANSITION DETECTION
# ═════════════════════════════════════════════════════════════════════════════

def _detect_transitions(timeline: list) -> list:
    transitions = []
    prev = None
    for entry in timeline:
        dom = entry["dominant"]["label"]
        if prev is not None and dom != prev:
            transitions.append({
                "frame_index":   entry["frame_index"],
                "timestamp_sec": entry.get("timestamp_sec"),
                "from_emotion":  prev,
                "to_emotion":    dom,
            })
        prev = dom
    return transitions


# ═════════════════════════════════════════════════════════════════════════════
#  SCENE-LEVEL AGGREGATION
# ═════════════════════════════════════════════════════════════════════════════

def _aggregate_scene(per_face_results: list) -> dict:
    if not per_face_results:
        return {
            "label": "neutral", "confidence": 1.0,
            "confidence_percent": 100.0, "category": "neutral",
        }
    agg = [0.0] * NUM_CLASSES
    for face in per_face_results:
        for item in face["combined_results"]:
            agg[_FUSION_INDEX[item["label"]]] += item["confidence"]
    agg = _normalize_probs(agg)
    return _dominant(agg)


# ═════════════════════════════════════════════════════════════════════════════
#  WORKER FUNCTION  (runs in subprocess — has its own model instances)
# ═════════════════════════════════════════════════════════════════════════════

_worker_net        = None
_worker_recognizer = None


def _worker_init():
    """Called once when each worker process starts — loads models locally."""
    global _worker_net, _worker_recognizer
    _worker_net        = _load_dnn_detector()
    _worker_recognizer = HSEmotionRecognizer(model_name=EMOTION_MODEL_NAME)


def _process_single_frame(args: tuple) -> tuple:
    """
    Process one sampled frame end-to-end inside a worker process.
    args: (frame_idx, sample_idx, bgr_bytes, native_fps, frame_shape)

    Frames passed as raw bytes — avoids numpy array pickle overhead.
    Returns (sample_idx, timestamp_sec, face_results_list).
    """
    frame_idx, sample_idx, bgr_bytes, native_fps, shape = args
    bgr = np.frombuffer(bgr_bytes, dtype=np.uint8).reshape(shape)

    timestamp_sec = round(frame_idx / native_fps, 3)
    frame, _      = _load_frame(bgr)
    faces         = _detect_faces(frame, net=_worker_net)

    if not faces:
        return (sample_idx, timestamp_sec, [])

    face_results = []
    for face_info in faces:
        crop = _align_and_crop(frame, face_info)
        if crop is None:
            continue
        probs = _infer_emotion(crop, recognizer=_worker_recognizer)
        probs, _ = _apply_confidence_gate(probs)
        face_results.append({
            "bbox":  face_info["bbox"],
            "score": face_info["score"],
            "probs": probs,
        })

    return (sample_idx, timestamp_sec, face_results)


# ═════════════════════════════════════════════════════════════════════════════
#  FRAME PRE-READING
# ═════════════════════════════════════════════════════════════════════════════

def _read_sampled_frames(video_path: str, frame_step: int) -> tuple:
    """
    Decode all sampled frames into memory in one tight loop,
    applying frame-diff skipping to drop near-duplicate frames.
    Returns (sampled_list, native_fps, total_frames).
    """
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        raise ValueError(f"Cannot open video: {video_path}")

    native_fps   = cap.get(cv2.CAP_PROP_FPS) or 25.0
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))

    sampled   = []
    prev_bgr  = None
    frame_idx = 0
    skipped   = 0

    while True:
        ret, bgr = cap.read()
        if not ret:
            break
        if frame_idx % frame_step == 0:
            if prev_bgr is not None and _frames_are_similar(prev_bgr, bgr):
                skipped += 1
            else:
                sampled.append((frame_idx, bgr))
                prev_bgr = bgr
        frame_idx += 1

    cap.release()

    if skipped:
        log.info("Frame-diff skip: dropped %d/%d near-duplicate frames",
                 skipped, skipped + len(sampled))

    return sampled, native_fps, total_frames


# ═════════════════════════════════════════════════════════════════════════════
#  SINGLE IMAGE PREDICTION
# ═════════════════════════════════════════════════════════════════════════════

def predict_emotion_image(image_source, filename: str = "image") -> dict:
    start = time.time()

    frame, quality  = _load_frame(image_source)
    faces_detected  = _detect_faces(frame)
    per_face_results = []

    for face_idx, face_info in enumerate(faces_detected, start=1):
        crop = _align_and_crop(frame, face_info)
        if crop is None:
            log.warning("Face #%d: crop failed — skipping", face_idx)
            continue
        probs = _infer_emotion(crop)
        probs, was_gated = _apply_confidence_gate(probs)
        dom = _dominant(probs)
        per_face_results.append({
            "face_id":                face_idx,
            "bbox":                   face_info["bbox"],
            "detect_score":           round(face_info["score"], 4),
            "combined_final_emotion": dom,
            "combined_results":       _results_sorted(probs),
            "confidence_gated":       was_gated,
        })

    scene = _aggregate_scene(per_face_results)
    processing_ms = round((time.time() - start) * 1000, 3)

    return {
        "image_filename":     filename,
        "faces_detected":     len(per_face_results),
        "faces":              per_face_results,
        "scene_emotion":      scene,
        "frame_quality":      quality,
        "timestamp":          datetime.now().isoformat(),
        "processing_time_ms": processing_ms,
        "model_info": {
            "detector":      "opencv-dnn-res10-ssd",
            "emotion_model": EMOTION_MODEL_NAME,
            "tracker":       None,
            "version":       "v1.2",
        },
    }


# ═════════════════════════════════════════════════════════════════════════════
#  VIDEO PREDICTION
# ═════════════════════════════════════════════════════════════════════════════

def predict_emotion_video(video_path: str) -> dict:
    """
    Full video emotion prediction with per-face tracking + timeline.
    Uses ProcessPoolExecutor (bypasses GIL) for parallel frame inference.
    DeepSORT tracking runs sequentially after (stateful).
    """
    if not _DEEPSORT_AVAILABLE:
        raise RuntimeError(
            "deep_sort_realtime is not installed. Run: pip install deep-sort-realtime"
        )

    start = time.time()

    # ── 1. Probe video metadata ───────────────────────────────────────────────
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        raise ValueError(f"Cannot open video: {video_path}")
    native_fps   = cap.get(cv2.CAP_PROP_FPS) or 25.0
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    cap.release()

    duration_sec   = total_frames / native_fps
    fps_target     = _adaptive_fps_target(duration_sec)
    frame_step     = max(1, int(round(native_fps / fps_target)))

    log.info(
        "Video: %.1fs, %.0f fps, %d frames | adaptive fps_target=%.1f → step=%d, workers=%d",
        duration_sec, native_fps, total_frames, fps_target, frame_step, VIDEO_WORKER_PROCS,
    )

    # ── 2. Pre-read sampled frames (with diff-skip) ───────────────────────────
    t0 = time.time()
    sampled_frames, _, _ = _read_sampled_frames(video_path, frame_step)
    log.info("Pre-read %d frames in %.2fs", len(sampled_frames), time.time() - t0)

    if not sampled_frames:
        log.warning("No frames sampled from video.")
        return _empty_video_result(video_path, duration_sec, total_frames, start)

    # ── 3. Parallel inference via ProcessPoolExecutor ─────────────────────────
    work_items = [
        (
            frame_idx,
            sample_idx,
            bgr.tobytes(),      # raw bytes — faster to pickle than ndarray
            native_fps,
            bgr.shape,
        )
        for sample_idx, (frame_idx, bgr) in enumerate(sampled_frames)
    ]

    frame_results: dict = {}
    t1 = time.time()

    with ProcessPoolExecutor(
        max_workers=VIDEO_WORKER_PROCS,
        initializer=_worker_init,   # loads models once per worker at startup
    ) as pool:
        futures = {
            pool.submit(_process_single_frame, item): item[1]
            for item in work_items
        }
        for future in as_completed(futures):
            result = future.result()
            if result is not None:
                frame_results[result[0]] = result

    log.info("Parallel inference: %.2fs for %d frames", time.time() - t1, len(sampled_frames))

    # ── 4. DeepSORT tracking (sequential — stateful) ──────────────────────────
    tracker    = DeepSort(max_age=10, n_init=3, nn_budget=100)
    track_data: dict = {}

    for sample_idx in sorted(frame_results.keys()):
        s_idx, timestamp_sec, face_list = frame_results[sample_idx]

        frame_idx_orig, bgr_orig = sampled_frames[sample_idx]
        frame_for_ds, _          = _load_frame(bgr_orig)

        ds_detections = [
            (
                [f["bbox"][0], f["bbox"][1],
                 f["bbox"][2] - f["bbox"][0],
                 f["bbox"][3] - f["bbox"][1]],
                f["score"], 0,
            )
            for f in face_list
        ]
        tracks = tracker.update_tracks(ds_detections, frame=frame_for_ds)

        for track in tracks:
            if not track.is_confirmed():
                continue

            tx1, ty1, tx2, ty2 = [int(v) for v in track.to_ltrb()]
            track_id = int(track.track_id)

            best_face, best_iou = None, 0.0
            for f in face_list:
                iou = _bbox_iou([tx1, ty1, tx2, ty2], f["bbox"])
                if iou > best_iou:
                    best_iou, best_face = iou, f

            if best_face is None or best_iou < 0.3:
                continue

            if track_id not in track_data:
                track_data[track_id] = {
                    "raw_probs": [], "frame_indices": [], "timestamps": [],
                }
            track_data[track_id]["raw_probs"].append(best_face["probs"])
            track_data[track_id]["frame_indices"].append(s_idx)
            track_data[track_id]["timestamps"].append(timestamp_sec)

    # ── 5. Per-track smoothing + timeline ─────────────────────────────────────
    faces_output = []
    for face_num, (track_id, td) in enumerate(
        sorted(track_data.items(), key=lambda kv: kv[0]), start=1
    ):
        raw, fidxs, tss = td["raw_probs"], td["frame_indices"], td["timestamps"]
        smoothed = _smooth_bidirectional(raw)
        timeline = []
        combined = [0.0] * NUM_CLASSES

        for probs, fidx, ts in zip(smoothed, fidxs, tss):
            dom_info = _dominant(probs)
            for j in range(NUM_CLASSES):
                combined[j] += probs[j]
            timeline.append({
                "frame_index":     fidx,
                "timestamp_sec":   ts,
                "probabilities":   {FUSION_LABELS[j]: round(float(probs[j]), 4) for j in range(NUM_CLASSES)},
                "dominant":        dom_info,
                "frame_reference": f"track_{track_id}_frame_{fidx}",
            })

        n = len(smoothed)
        combined    = _normalize_probs([x / n for x in combined]) if n > 0 else _uniform_probs()
        transitions = _detect_transitions(timeline)

        faces_output.append({
            "face_id":                face_num,
            "track_id":               track_id,
            "frames_seen":            n,
            "timeline":               timeline,
            "combined_final_emotion": _dominant(combined),
            "combined_results":       _results_sorted(combined),
            "transitions":            transitions,
        })

    # ── 6. Scene + output ─────────────────────────────────────────────────────
    scene = _aggregate_scene(faces_output)
    processing_ms = round((time.time() - start) * 1000, 3)

    return {
        "video_filename":     video_path.split("/")[-1].split("\\")[-1],
        "duration_seconds":   round(duration_sec, 3),
        "total_frames":       total_frames,
        "sampled_frames":     len(sampled_frames),
        "faces_tracked":      len(faces_output),
        "faces":              faces_output,
        "scene_emotion":      scene,
        "timestamp":          datetime.now().isoformat(),
        "processing_time_ms": processing_ms,
        "model_info": {
            "detector":      "opencv-dnn-res10-ssd",
            "emotion_model": EMOTION_MODEL_NAME,
            "tracker":       "deepsort",
            "version":       "v1.2",
        },
    }


def _empty_video_result(video_path, duration_sec, total_frames, start) -> dict:
    return {
        "video_filename":     video_path.split("/")[-1].split("\\")[-1],
        "duration_seconds":   round(duration_sec, 3),
        "total_frames":       total_frames,
        "sampled_frames":     0,
        "faces_tracked":      0,
        "faces":              [],
        "scene_emotion":      _aggregate_scene([]),
        "timestamp":          datetime.now().isoformat(),
        "processing_time_ms": round((time.time() - start) * 1000, 3),
        "model_info": {
            "detector":      "opencv-dnn-res10-ssd",
            "emotion_model": EMOTION_MODEL_NAME,
            "tracker":       "deepsort",
            "version":       "v1.2",
        },
    }


# ═════════════════════════════════════════════════════════════════════════════
#  INTERNAL HELPERS
# ═════════════════════════════════════════════════════════════════════════════

def _bbox_iou(a: list, b: list) -> float:
    ix1 = max(a[0], b[0]);  iy1 = max(a[1], b[1])
    ix2 = min(a[2], b[2]);  iy2 = min(a[3], b[3])
    inter = max(0, ix2 - ix1) * max(0, iy2 - iy1)
    if inter == 0:
        return 0.0
    area_a = (a[2] - a[0]) * (a[3] - a[1])
    area_b = (b[2] - b[0]) * (b[3] - b[1])
    return inter / float(area_a + area_b - inter)
