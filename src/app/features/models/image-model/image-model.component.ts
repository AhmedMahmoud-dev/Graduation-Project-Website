import { Component, HostListener, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { FooterSectionComponent } from '../../../shared/components/footer/footer.component';
import { ModelDocTocComponent, TocItem } from '../../../shared/components/model-docs/model-doc-toc/model-doc-toc.component';
import { ModelDocSectionComponent } from '../../../shared/components/model-docs/model-doc-section/model-doc-section.component';
import { PythonCodeBlockComponent } from '../../../shared/components/model-docs/python-code-block/python-code-block.component';
import { EmotionIconComponent } from '../../../shared/components/emotion-icon/emotion-icon.component';
import { ModelDocScrollspyBase } from '../../../shared/components/model-docs/model-doc-scrollspy.base';

@Component({
  selector: 'app-image-model',
  standalone: true,
  imports: [
    RouterModule,
    FooterSectionComponent,
    ModelDocTocComponent,
    ModelDocSectionComponent,
    PythonCodeBlockComponent,
    EmotionIconComponent
  ],
  templateUrl: './image-model.component.html',
  styleUrl: './image-model.component.css'
})
export class ImageModelComponent extends ModelDocScrollspyBase implements OnInit {

  override ngOnInit() {
    super.ngOnInit();
  }

  tocItems: TocItem[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'pipeline-v12', label: 'Unified Visual Pipeline' },
    { id: 'face-detection', label: 'Face Detection (SSD)' },
    { id: 'emotion-classes', label: 'Emotion Classes' },
    { id: 'image-analysis', label: 'Image Inference & Crop' },
    { id: 'video-analysis', label: 'Parallel Video Inference' },
    { id: 'temporal-modeling', label: 'Tracking & Smoothing' },
    { id: 'output-format', label: 'Output JSON Format' },
    { id: 'limitations', label: 'Limitations' }
  ];

  emotions = [
    { label: 'anger', category: 'negative', description: 'Detected from facial muscle movements like furrowed brows and tightened lips.' },
    { label: 'contempt', category: 'negative', description: 'Indicated by a unilateral lip corner pull (smirk) or asymmetrical sneer.' },
    { label: 'disgust', category: 'negative', description: 'Characterized by nose wrinkling, upper lip raising, and narrowed eyes.' },
    { label: 'fear', category: 'negative', description: 'Identified by widened eyes, raised eyebrows, and slightly parted lips.' },
    { label: 'happiness', category: 'positive', description: "Marked by cheek raising, crow's feet wrinkles, and smiling lip corners." },
    { label: 'neutral', category: 'neutral', description: 'A calm, baseline state with relaxed facial features and no active muscle contraction.' },
    { label: 'sadness', category: 'negative', description: 'Recognized from inner eyebrow raising, drooping eyelids, and downturned lip corners.' },
    { label: 'surprise', category: 'positive', description: 'Indicated by widely opened eyes, raised curved brows, and dropped jaw.' }
  ];

  // Python code snippets from model_loader_image.py
  codeFaceDetection = `def _detect_faces(frame_bgr, net=None):
    """
    Run OpenCV DNN SSD face detector on a BGR frame.
    Runs in ~50-100ms on CPU, compared to 5-8s for RetinaFace.
    """
    if net is None:
        net = _dnn_net

    h, w = frame_bgr.shape[:2]
    blob = cv2.dnn.blobFromImage(
        frame_bgr, scalefactor=1.0, size=(300, 300),
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
    return faces`;

  codeAlignCrop = `def _align_and_crop(frame_bgr, face_info):
    """
    Extracts face crop with 15% horizontal and 25% vertical padding.
    Converts BGR image buffer into standard RGB format for model input.
    """
    x1, y1, x2, y2 = face_info["bbox"]
    rgb = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2RGB)

    bw, bh = x2 - x1, y2 - y1
    pad_x, pad_y = int(bw * 0.15), int(bh * 0.25)
    cx1 = max(0, x1 - pad_x)
    cy1 = max(0, y1 - pad_y)
    cx2 = min(rgb.shape[1] - 1, x2 + pad_x)
    cy2 = min(rgb.shape[0] - 1, y2 + pad_y)

    crop = rgb[cy1:cy2, cx1:cx2]
    return crop if crop.size > 0 else None`;

  codeFrameSampling = `def _adaptive_fps_target(duration_sec):
    """Dynamically scales target FPS to keep processing times low."""
    for threshold, fps in _FPS_TIERS:
        if duration_sec < threshold:
            return fps
    return 0.5

def _frames_are_similar(a, b, threshold=0.985):
    """
    Compares consecutive frames using downsampled mean absolute difference.
    If frames are >98.5% similar, we skip processing the duplicate frame.
    """
    size = (80, 45)
    ga = cv2.resize(cv2.cvtColor(a, cv2.COLOR_BGR2GRAY), size)
    gb = cv2.resize(cv2.cvtColor(b, cv2.COLOR_BGR2GRAY), size)
    diff = np.mean(np.abs(ga.astype(np.float32) - gb.astype(np.float32))) / 255.0
    return (1.0 - diff) > threshold`;

  codeParallelInference = `def predict_emotion_video(video_path):
    # ... Frame decimation and similarity check ...
    sampled_frames, native_fps, total_frames = _read_sampled_frames(video_path, frame_step)

    # 4. Multi-processing parallel workers bypass the GIL
    # Each process instantiates its own local HSEmotion model copy (~80MB RAM)
    with ProcessPoolExecutor(
        max_workers=VIDEO_WORKER_PROCS,
        initializer=_worker_init,
    ) as pool:
        futures = {
            pool.submit(_process_single_frame, item): item[1]
            for item in work_items
        }
        for future in as_completed(futures):
            result = future.result()
            if result is not None:
                frame_results[result[0]] = result`;

  codeDeepSortBiEma = `def predict_emotion_video(video_path):
    # ... parallel frame analysis ...
    tracker = DeepSort(max_age=10, n_init=3, nn_budget=100)
    
    # Stateful sequential DeepSORT tracking across frames
    for sample_idx in sorted(frame_results.keys()):
        tracks = tracker.update_tracks(ds_detections, frame=frame_for_ds)
        # Match tracks to faces using Bounding Box IoU overlap ...
        
    # Forward-Backward EMA Smoothing to eliminate casual time lag
    for track_id, td in track_data.items():
        smoothed = _smooth_bidirectional(td["raw_probs"])
        # Timeline and transitions assembly ...`;

  codeOutputFormat = `{
  "image_filename": "portrait.jpg",
  "faces_detected": 1,
  "faces": [
    {
      "face_id": 1,
      "bbox": [120, 80, 240, 220],
      "detect_score": 0.992,
      "combined_final_emotion": {
        "label": "happiness",
        "confidence": 0.942,
        "confidence_percent": 94.2,
        "category": "positive"
      },
      "combined_results": [
        { "label": "happiness", "confidence": 0.942, "confidence_percent": 94.2 },
        { "label": "neutral", "confidence": 0.041, "confidence_percent": 4.1 },
        { "label": "surprise", "confidence": 0.012, "confidence_percent": 1.2 }
      ],
      "confidence_gated": false
    }
  ],
  "scene_emotion": {
    "label": "happiness",
    "confidence": 0.942,
    "confidence_percent": 94.2,
    "category": "positive"
  },
  "processing_time_ms": 112.5
}`;

  @HostListener('window:scroll')
  override onScroll(): void {
    super.onScroll();
  }
}
