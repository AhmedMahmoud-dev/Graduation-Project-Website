## 2. Save Audio Analysis

Saves a multimodal audio/text analysis result along with the audio file.

**Endpoint:** `POST /api/analysis/audio`  
**Authentication:** Required (Bearer Token)  
**Content-Type:** `multipart/form-data`

### Form Fields

- `audio_file`: (File) The recorded audio file.
- `request`: (String/JSON) The metadata matching the Audio Analysis structure.
- `cliend_id`: this is the analysis uuid not user id.

### Request Metadata Example (`request` field)

```json
{
  "client_id": "uuid-from-frontend",
  "result": {
    "audio_filename": "test_audio.mp3",
    "transcribed_text": "Hello, my name is Ahmed Mahmoud.",
    "audio_emotion": {
      "timeline": [
        {
          "segment_index": 0,
          "timestamp_offset": 0,
          "probabilities": {
            "joy": 0.0018,
            "neutral": 0.5594,
            "sadness": 0.0078
          },
          "dominant": {
            "label": "neutral",
            "confidence": 0.5594,
            "category": "neutral"
          },
          "intensity_weight": 1,
          "is_speech": true,
          "frame_reference": "audio_seg_0"
        }
      ],
      "combined_probs": [0.012, 0.663, 0.006],
      "segments_count": 3,
      "duration_seconds": 3.712,
      "transitions": [],
      "quality": {
        "clipping_detected": false,
        "original_peak": 0.4507
      }
    },
    "text_emotion": {
      "text": "Hello, my name is Ahmed Mahmoud.",
      "sentences_count": 1,
      "sentences_analysis": [
        {
          "sentence": "Hello, my name is Ahmed Mahmoud",
          "probabilities": { "neutral": 0.7071, "joy": 0.1735 },
          "dominant": {
            "label": "neutral",
            "confidence": 0.7071,
            "category": "neutral"
          },
          "intensity_weight": 1
        }
      ],
      "full_text_analysis": {
        "probabilities": { "neutral": 0.8372, "joy": 0.0786 },
        "dominant": {
          "label": "neutral",
          "confidence": 0.8372,
          "category": "neutral"
        }
      },
      "combined_final_emotion": {
        "label": "neutral",
        "confidence": 0.764878,
        "confidence_percent": 76.49,
        "category": "neutral"
      },
      "combined_results": [
        {
          "label": "neutral",
          "confidence": 0.764878,
          "confidence_percent": 76.49
        }
      ],
      "input_info": {
        "input_length": 32,
        "token_count": 9,
        "input_was_truncated": false
      },
      "timestamp": "2026-04-14T22:33:12Z",
      "processing_time_ms": 150.2,
      "model_info": {
        "name": "emotion-text-v1",
        "version": "1.0",
        "device_used": "cpu"
      }
    },
    "final_multimodal_emotion": {
      "label": "neutral",
      "confidence": 0.722452,
      "confidence_percent": 72.25,
      "category": "neutral"
    },
    "final_multimodal_results": [
      {
        "label": "neutral",
        "confidence": 0.722452,
        "confidence_percent": 72.25
      }
    ],
    "timestamp": "2026-04-14T22:33:22Z",
    "processing_time_ms": 30616.1,
    "model_info": {
      "audio_model": "iic/emotion2vec_plus_base",
      "text_model_api": "http://api/text",
      "whisper_model": "small",
      "fusion_version": "v5.0"
    }
  }
}
```

### Success Response (200 OK)

```json
{
  "is_success": true,
  "message": "Audio analysis saved successfully",
  "data": 124,
  "status_code": 200,
  "timestamp": "2026-04-14T22:34:00Z"
}
```

---
