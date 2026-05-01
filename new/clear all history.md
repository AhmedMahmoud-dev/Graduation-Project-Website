## 6. Clear All History

Deletes all analysis records and associated media for the current user.

**Endpoint:** `DELETE /api/analysis/clear`  
**Authentication:** Required (Bearer Token)

### Success Response (200 OK)

```json
{
  "is_success": true,
  "message": "All analysis history has been cleared successfully",
  "data": true,
  "status_code": 200,
  "timestamp": "2026-04-15T10:15:00Z"
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
