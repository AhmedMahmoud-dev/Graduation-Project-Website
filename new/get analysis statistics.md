## 8. Get Analysis Statistics

Retrieves lifetime usage metrics and emotion distribution data for the dashboard.

**Endpoint:** `GET /api/analysis/stats`  
**Authentication:** Required (Bearer Token)

### Success Response (200 OK)

```json
{
  "is_success": true,
  "message": "Global statistics retrieved successfully",
  "data": {
    "usage_metrics": {
      "total_analyses": 150,
      "text_count": 100,
      "audio_count": 50,
      "total_tokens": 4500,
      "total_audio_duration_seconds": 1200,
      "avg_confidence": 0.85
    },
    "emotion_distribution": {
      "labels": {
        "joy": 50,
        "neutral": 70,
        "sadness": 30
      },
      "categories": {
        "Positive": 50,
        "neutral": 70,
        "Negative": 30
      }
    },
    "most_frequent": {
      "label": "neutral",
      "count": 70
    },
    "recent_activity": [
      {
        "id": 101,
        "client_id": "uuid-123",
        "type": "text",
        "timestamp": "2026-04-15T01:30:00Z",
        "label": "joy",
        "confidence": 92.5,
        "snippet": "I am so excited about the progress..."
      }
    ],
    "activity_trend": [
      { "timestamp": "2026-04-15T01:00:00Z", "confidence": 75.0 },
      { "timestamp": "2026-04-15T01:30:00Z", "confidence": 92.5 }
    ]
  },
  "status_code": 200,
  "timestamp": "2026-04-15T10:20:00Z"
}
```

---

## Error Handling (Standard)

If an error occurs, the response will follow this structure:

### Error Example (400 Bad Request)

```json
{
  "is_success": false,
  "message": "Failed to save analysis",
  "status_code": 400,
  "errors": ["User not found. Your session might be invalid."],
  "timestamp": "2026-04-14T20:42:05Z"
}
```

### Common Status Codes

| Code | Meaning               | Reason                             |
| :--- | :-------------------- | :--------------------------------- |
| 200  | OK                    | Success.                           |
| 400  | Bad Request           | Validation error or invalid data.  |
| 401  | Unauthorized          | Missing or invalid Bearer token.   |
| 404  | Not Found             | record not found or no permission. |
| 500  | Internal Server Error | Database or server-side crash.     |
