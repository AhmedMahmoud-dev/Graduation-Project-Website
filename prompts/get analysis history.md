## 3. Get Analysis History

Retrieves a paginated list of analysis summaries for the current user.

**Endpoint:** `GET /api/analysis/history`  
**Authentication:** Required (Bearer Token)

### Query Parameters

- `page`: (int) Default: 1
- `limit`: (int) Default: 10
- `type`: (string) Filter by "Text" or "Audio"
- `search`: (string) Filter by text content or emotion label (Optional)

### Success Response (200 OK)

The `data` field contains an array of `analysis` objects. Pagination metadata is included at the root level.

```json
{
  "is_success": true,
  "message": "Analysis history retrieved successfully",
  "data": [
    {
      "id": 123,
      "client_id": "uuid-from-frontend",
      "type": "Text",
      "dominant_emotion": "joy",
      "emotion_category": "positive",
      "confidence": 0.95,
      "confidence_percent": 95.0,
      "summary_text": "The input text that was analyzed...",
      "timestamp": "2026-04-14T20:41:35Z"
    }
  ],
  "total": 111,
  "page": 1,
  "page_size": 10,
  "status_code": 200,
  "timestamp": "2026-04-15T10:00:00Z"
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
