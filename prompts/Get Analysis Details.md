## 4. Get Analysis Details

Retrieves the full, original analysis results for a specific record.

**Endpoint:** `GET /api/analysis/{id}`  
**Authentication:** Required (Bearer Token)

### Success Response (200 OK)

The `result` field contains the **exact same structure** as the `POST` payload provided during save.

```json
{
  "is_success": true,
  "message": "Analysis details retrieved successfully",
  "data": {
    "id": 123,
    "client_id": "uuid",
    "type": "Text",
    "timestamp": "2026-04-14T20:41:35Z",
    "note": null,
    "result": {
      /* Full analysis result object preserved from original POST */
    }
  },
  "status_code": 200,
  "timestamp": "2026-04-15T10:05:00Z"
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
