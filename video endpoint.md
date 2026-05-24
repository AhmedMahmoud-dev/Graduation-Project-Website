## 4. Save Video Analysis

Saves a video analysis result along with the uploaded physical video file.

**Endpoint:** `POST /api/analysis/video`  
**Authentication:** Required (Bearer Token)  
**Content-Type:** `multipart/form-data`

### Form Fields

- `VideoFile`: (File) The uploaded physical video file.
- `Request`: (String/JSON) The metadata matching the Video Analysis structure.
- `client_id`: this is the analysis uuid not user id.

### Request Metadata Example (`Request` field)

```json
{
  "client_id": "3c5f8df2-d04b-4b2a-aef2-f7b53ec6e2d1",
  "result": {
    "video_filename": "test_video.mp4",
    "duration_seconds": 8.0,
    "total_frames": 192,
    "sampled_frames": 24,
    "faces_tracked": 1,
    "faces": [
      {
        "face_id": 1,
        "track_id": 1,
        "frames_seen": 22,
        "timeline": [
          {
            "frame_index": 2,
            "timestamp_sec": 0.667,
            "probabilities": {
              "anger": 0.0072,
              "contempt": 0.0001,
              "disgust": 0.0976,
              "fear": 0.0061,
              "happiness": 0.7911,
              "neutral": 0.0002,
              "sadness": 0.0977,
              "surprise": 0.0001
            },
            "dominant": {
              "label": "happiness",
              "confidence": 0.7910647754321439,
              "confidence_percent": 79.11,
              "category": "positive"
            },
            "frame_reference": "track_1_frame_2"
          },
          {
            "frame_index": 3,
            "timestamp_sec": 1.0,
            "probabilities": {
              "anger": 0.0103,
              "contempt": 0.0002,
              "disgust": 0.1401,
              "fear": 0.0087,
              "happiness": 0.7009,
              "neutral": 0.0002,
              "sadness": 0.1394,
              "surprise": 0.0002
            },
            "dominant": {
              "label": "happiness",
              "confidence": 0.7009485543343126,
              "confidence_percent": 70.09,
              "category": "positive"
            },
            "frame_reference": "track_1_frame_3"
          }
        ],
        "combined_final_emotion": {
          "label": "happiness",
          "confidence": 0.7888167629907953,
          "confidence_percent": 78.88,
          "category": "positive"
        },
        "combined_results": [
          {
            "label": "happiness",
            "confidence": 0.7888167629907953,
            "confidence_percent": 78.88
          },
          {
            "label": "neutral",
            "confidence": 0.15562536734644647,
            "confidence_percent": 15.56
          },
          {
            "label": "sadness",
            "confidence": 0.05555786546377254,
            "confidence_percent": 5.56
          }
        ],
        "transitions": [
          {
            "frame_index": 6,
            "timestamp_sec": 2.0,
            "from_emotion": "happiness",
            "to_emotion": "sadness"
          }
        ]
      }
    ],
    "scene_emotion": {
      "label": "happiness",
      "confidence": 0.7888167629907953,
      "confidence_percent": 78.88,
      "category": "positive"
    },
    "timestamp": "2026-05-22T16:40:05.958250",
    "processing_time_ms": 9551.068,
    "model_info": {
      "detector": "opencv-dnn-res10-ssd",
      "emotion_model": "enet_b0_8_best_vgaf",
      "tracker": "deepsort",
      "version": "v1.2"
    }
  }
}
```

### Success Response (200 OK)

```json
{
  "is_success": true,
  "message": "Video analysis saved successfully",
  "data": 126,
  "status_code": 200,
  "timestamp": "2026-05-22T16:41:00Z"
}
```

---
