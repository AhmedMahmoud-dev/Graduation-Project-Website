# AI Video Metadata Bug Report

## 1. The Problem
When analyzing recorded videos (WebM format), the AI response returns impossible values for video metadata:
- **`total_frames`**: `-9223372036854775808` (This is exactly `INT64_MIN`).
- **`duration_seconds`**: `-9223372036854776.0`.

These values cause the C# backend to return a `500 Internal Server Error` because it cannot validate or store negative time/frame counts.

## 2. Root Cause
The root cause is in **OpenCV's VideoCapture engine**. 
When a video file (like a raw WebM blob) lacks a standardized metadata header, calling `cap.get(cv2.CAP_PROP_FRAME_COUNT)` does not return `0` or `-1`. Instead, it returns a 64-bit integer underflow/overflow value (`-2^63`).

## 3. Implementation Status
We have already modified `image video AI/model_loader_image.py` with the following:
1.  **Metadata Sanitization**: Added checks to detect if `total_frames` is `<= 0`.
2.  **Manual Counting**: Added a fallback where the code counts the frames manually during the decode loop (`_read_sampled_frames`) and overwrites the garbage value with the true count.
3.  **FPS Sanitization**: Added checks to ensure `native_fps` is between 1 and 120, defaulting to 25.0 if the codec reports garbage.

## 4. Why it might still be failing
- **Server Restart**: If the Python AI service (e.g., `main_image.py`) was not restarted after the changes to `model_loader_image.py`, it is still running the old logic in memory.
- **Empty Fallback**: If no frames are sampled at all, the `_empty_video_result` function might still be receiving the raw garbage values before they are patched.

## 5. Recommended Next Steps for the AI Session
1.  **Verify the Return Logic**: Ensure that the `duration_sec` and `total_frames` used in the final `return` dictionary are the *recalculated* versions, not the initial probed ones.
2.  **Explicit Type Casting**: Ensure the Python `round()` and `int()` functions are handling the overflowed values correctly before they reach the JSON serializer.
3.  **Hard-Reset Metadata**: At the very start of `predict_emotion_video`, if `total_frames < 0`, it should be set to `0` immediately to prevent any math operations from propagating the garbage value.
