# Missing Information in Analysis V2 API

After thoroughly reviewing the `analysis_v2_docs.md` document and mapping it to the frontend requirements (specifically the Dashboard UI code we reviewed earlier), the V2 APIs are extremely well-structured! However, there are a few pieces of missing data needed to ensure the frontend dashboards and history views run fully optimized off the backend.

Here is a structured breakdown of the missing information that should be added to the backend models and documentation.

## 1. `GET /api/analysis/stats`

The `DashboardComponent` requires two specific data arrays to render the "Recent Processing Feed" and the "Precision Trend" line chart. These are currently missing from the `stats` response.

### Missing Data to Add:

1. **`recent_activity`** (Array): The 4 most recent analysis sessions to feed the recent activity list.
2. **`activity_trend`** (Array): The 15 most recent analysis confidences and timestamps to draw the line chart.

### Required Backend Additions (JSON Example):

```json
{
  "data": {
    // ... existing usage_metrics, emotion_distribution, most_frequent ...

    "recent_activity": [
      {
        "id": 123, // or UUID string
        "type": "text", // "text" or "audio"
        "timestamp": "2026-04-14T20:41:35Z",
        "label": "joy",
        "confidence": 95.0,
        "snippet": "The results of the project are looking amazing..." // First 55 chars of text/transcription
      }
    ],
    "activity_trend": [
      {
        "timestamp": "2026-04-14T20:41:35Z",
        "confidence": 95.0
      }
    ]
  }
}
```

---

## 2. `GET /api/analysis/history`

The Analysis History endpoint is actually very solid. It contains the `summary_text` and `confidence_percent` which is exactly what the History page table needs. However, there is one small missing piece of metadata that is typically useful for Audio records.

### Missing Data to Add:

1. **`duration_seconds`** (Optional Number): If the type is `Audio`, returning the duration in the history list allows the frontend to display how long the audio track was without needing to fetch the full Details endpoint.

### Required Backend Additions (JSON Example):

```json
{
  "data": [
    {
      "id": 124,
      "client_id": "uuid-from-frontend",
      "type": "Audio",
      "dominant_emotion": "neutral",
      "emotion_category": "neutral",
      "confidence": 0.722,
      "confidence_percent": 72.25,
      "summary_text": "Hey, hello, my name is Ahmed Mahmoud.",
      "timestamp": "2026-04-14T22:33:22Z",
      "duration_seconds": 3.712 // <--- NEW OPTIONAL FIELD
    }
  ]
}
```

---

### Conclusion

Beyond these specific fields required for the data arrays on the dashboard and the audio duration in the history table, the provided `analysis_v2_docs.md` is complete and covers all necessary authentication, HTTP status codes, error schemas, and standard `ApiResponse<T>` formatting properties!
