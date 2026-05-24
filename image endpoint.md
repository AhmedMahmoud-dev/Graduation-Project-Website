## 3. Save Image Analysis

Saves an image analysis result along with the uploaded physical image file.

**Endpoint:** `POST /api/analysis/image`  
**Authentication:** Required (Bearer Token)  
**Content-Type:** `multipart/form-data`

### Form Fields

- `ImageFile`: (File) The uploaded physical image file.
- `Request`: (String/JSON) The metadata matching the Image Analysis structure.
- `client_id`: this is the analysis uuid not user id.

### Request Metadata Example (`Request` field)

```json
{
  "client_id": "3c5f8df2-d04b-4b2a-aef2-f7b53ec6e2d1",
  "result": {
    "image_filename": "me2.jpg",
    "faces_detected": 1,
    "faces": [
      {
        "face_id": 1,
        "bbox": [233, 158, 369, 356],
        "detect_score": 0.9928,
        "combined_final_emotion": {
          "label": "neutral",
          "confidence": 0.512869454272216,
          "confidence_percent": 51.29,
          "category": "neutral"
        },
        "combined_results": [
          {
            "label": "neutral",
            "confidence": 0.512869454272216,
            "confidence_percent": 51.29
          },
          {
            "label": "contempt",
            "confidence": 0.29333542461992407,
            "confidence_percent": 29.33
          },
          {
            "label": "happiness",
            "confidence": 0.15264485091883007,
            "confidence_percent": 15.26
          },
          {
            "label": "anger",
            "confidence": 0.031780330901688504,
            "confidence_percent": 3.18
          },
          {
            "label": "sadness",
            "confidence": 0.004601457415548191,
            "confidence_percent": 0.46
          },
          {
            "label": "disgust",
            "confidence": 0.0029558451917666255,
            "confidence_percent": 0.3
          },
          {
            "label": "surprise",
            "confidence": 0.0017806020698136063,
            "confidence_percent": 0.18
          },
          {
            "label": "fear",
            "confidence": 3.203461021297466e-5,
            "confidence_percent": 0.0
          }
        ],
        "confidence_gated": false
      }
    ],
    "scene_emotion": {
      "label": "neutral",
      "confidence": 0.5128694542722161,
      "confidence_percent": 51.29,
      "category": "neutral"
    },
    "frame_quality": {
      "original_width": 4000,
      "original_height": 3000,
      "was_downscaled": true,
      "downscaled_to": [640, 480]
    },
    "timestamp": "2026-05-22T18:01:14.512083",
    "processing_time_ms": 328.777,
    "model_info": {
      "detector": "opencv-dnn-res10-ssd",
      "emotion_model": "enet_b0_8_best_vgaf",
      "tracker": null,
      "version": "v1.2"
    }
  }
}
```

### Success Response (200 OK)

```json
{
  "is_success": true,
  "message": "Image analysis saved successfully",
  "data": 125,
  "status_code": 200,
  "timestamp": "2026-05-22T18:02:00Z"
}
```

---
