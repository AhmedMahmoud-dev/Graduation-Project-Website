# main_image.py
"""
FastAPI entry point for the Image / Video Emotion Detection microservice.
Exposes two endpoints:
    POST /emotion/image   — single image file
    POST /emotion/video   — video file with per-face timeline
"""

import logging
import os
import time

import uvicorn
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from model_loader_image import predict_emotion_image, predict_emotion_video

# ── Logging ──────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(name)s  %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("image_api")

# ── App ──────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="Image / Video Emotion Detection API",
    version="1.0.0",
    description="Multi-face image and video emotion analysis with per-face timeline tracking",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

TMP_DIR          = "tmp_image"
MAX_FILE_SIZE_MB = 100

ALLOWED_IMAGE_EXT = {".jpg", ".jpeg", ".png", ".bmp", ".webp", ".tiff"}
ALLOWED_VIDEO_EXT = {".mp4", ".avi", ".mov", ".mkv", ".webm", ".flv", ".wmv"}


# ── Helpers ───────────────────────────────────────────────────────────────────

def _validate_ext(file: UploadFile, allowed_ext: set) -> str:
    """Validate file exists and has an allowed extension. Returns the extension."""
    if file is None or not file.filename:
        raise HTTPException(status_code=400, detail="No file uploaded.")

    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in allowed_ext:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type '{ext}'. Allowed: {', '.join(sorted(allowed_ext))}",
        )
    return ext


# ── Endpoints ─────────────────────────────────────────────────────────────────

@app.post("/emotion/image")
async def image_emotion_api(file: UploadFile = File(...)):
    """
    Detect emotions in a single image.

    Accepts: JPEG, PNG, BMP, WEBP, TIFF
    Returns: per-face emotion breakdown + scene-level aggregation.
    """
    _validate_ext(file, ALLOWED_IMAGE_EXT)

    contents = await file.read()
    size_mb = len(contents) / (1024 * 1024)
    if size_mb > MAX_FILE_SIZE_MB:
        raise HTTPException(
            status_code=400,
            detail=f"File too large ({size_mb:.1f} MB). Maximum is {MAX_FILE_SIZE_MB} MB.",
        )

    os.makedirs(TMP_DIR, exist_ok=True)
    safe_name = f"{int(time.time() * 1000)}_{file.filename}"
    path = os.path.join(TMP_DIR, safe_name)

    with open(path, "wb") as f:
        f.write(contents)

    log.info("Processing image '%s' (%.2f MB)", file.filename, size_mb)

    try:
        result = predict_emotion_image(path, filename=file.filename)
        return result
    except Exception as exc:
        log.exception("Image pipeline failed for '%s'", file.filename)
        raise HTTPException(status_code=500, detail=f"Processing failed: {exc}")
    finally:
        if os.path.exists(path):
            os.remove(path)


@app.post("/emotion/video")
async def video_emotion_api(file: UploadFile = File(...)):
    """
    Detect emotions across all frames of a video.

    Accepts: MP4, AVI, MOV, MKV, WEBM, FLV, WMV
    Returns: per-face timeline with transitions + scene-level aggregation.
    """
    _validate_ext(file, ALLOWED_VIDEO_EXT)

    contents = await file.read()
    size_mb = len(contents) / (1024 * 1024)
    if size_mb > MAX_FILE_SIZE_MB:
        raise HTTPException(
            status_code=400,
            detail=f"File too large ({size_mb:.1f} MB). Maximum is {MAX_FILE_SIZE_MB} MB.",
        )

    os.makedirs(TMP_DIR, exist_ok=True)
    safe_name = f"{int(time.time() * 1000)}_{file.filename}"
    path = os.path.join(TMP_DIR, safe_name)

    with open(path, "wb") as f:
        f.write(contents)

    log.info("Processing video '%s' (%.2f MB)", file.filename, size_mb)

    try:
        result = predict_emotion_video(path)
        return result
    except Exception as exc:
        log.exception("Video pipeline failed for '%s'", file.filename)
        raise HTTPException(status_code=500, detail=f"Processing failed: {exc}")
    finally:
        if os.path.exists(path):
            os.remove(path)


# ── Health ────────────────────────────────────────────────────────────────────

@app.get("/")
def home():
    return {"status": "Image/Video Emotion API is running", "version": "1.0.0"}


@app.get("/health")
def health():
    return {"status": "healthy"}


# ── Entry point ───────────────────────────────────────────────────────────────

if __name__ == "__main__":
    uvicorn.run("main_image:app", host="127.0.0.1", port=8004)
