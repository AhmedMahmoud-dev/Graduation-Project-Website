# Alerts API Documentation

This document outlines the endpoints for managing user alerts and alert settings. All responses follow the unified `ApiResponse<T>` structure with `snake_case` naming conventions for V2 endpoints, and standard naming for original alert endpoints.

---

## 1. Get List of Alerts

Retrieves a paginated list of alerts for the current user.

**Endpoint:** `GET /api/alerts`  
**Authentication:** Required (Bearer Token)

### Query Parameters

- `page`: (int) The page number to retrieve. Default: `1`.
- `pageSize`: (int) Number of items per page (max 50). Default: `10`.
- `severity`: (string) Filter by severity level (`low`, `medium`, `high`, `critical`).
- `resolved`: (bool) Filter by resolution status (`true` for resolved, `false` for unread).

### Success Response (200 OK)

```json
{
  "is_success": true,
  "message": "Success",
  "data": {
    "items": [
      {
        "id": 1,
        "user_id": "user-uuid",
        "analysis_v2_id": 123,
        "client_id": "client-uuid",
        "message": "High negative emotion level (85%) detected across 2 consecutive analyses.",
        "severity": "high",
        "triggered_at": "2026-04-16T12:00:00Z",
        "resolved": false,
        "resolved_at": null,
        "recommended_action": "Consider taking a break, reviewing emotional patterns, or contacting support."
      }
    ],
    "page": 1,
    "page_size": 10,
    "total_count": 1
  },
  "status_code": 200,
  "timestamp": "2026-04-16T13:00:00Z"
}
```

---

## 2. Get Alert Statistics

Retrieves summary statistics for the user's alerts.

**Endpoint:** `GET /api/alerts/stats`  
**Authentication:** Required (Bearer Token)

### Success Response (200 OK)

```json
{
  "is_success": true,
  "message": "Success",
  "data": {
    "total_alerts": 10,
    "unread_alerts": 3,
    "critical_alerts": 1,
    "high_alerts": 2
  },
  "status_code": 200,
  "timestamp": "2026-04-16T13:05:00Z"
}
```

---

## 3. Get Alert Details

Retrieves detailed information for a specific alert.

**Endpoint:** `GET /api/alerts/{id}`  
**Authentication:** Required (Bearer Token)

### Success Response (200 OK)

```json
{
  "is_success": true,
  "message": "Success",
  "data": {
    "id": 1,
    "user_id": "user-uuid",
    "analysis_v2_id": 123,
    "client_id": "client-uuid",
    "message": "High negative emotion level (85%) detected across 2 consecutive analyses.",
    "severity": "high",
    "triggered_at": "2026-04-16T12:00:00Z",
    "resolved": false,
    "resolved_at": null,
    "recommended_action": "Consider taking a break, reviewing emotional patterns, or contacting support."
  },
  "status_code": 200,
  "timestamp": "2026-04-16T13:10:00Z"
}
```

---

## 4. Resolve Alert

Marks an alert as resolved.

**Endpoint:** `PATCH /api/alerts/{id}/resolve`  
**Authentication:** Required (Bearer Token)

### Success Response (200 OK)

```json
{
  "is_success": true,
  "message": "Alert resolved successfully",
  "data": {
    "id": 1,
    "resolved": true,
    "resolved_at": "2026-04-16T13:15:00Z"
    /* ... other alert fields ... */
  },
  "status_code": 200,
  "timestamp": "2026-04-16T13:15:00Z"
}
```

---

## 5. Delete Alert

Soft-deletes an alert record.

**Endpoint:** `DELETE /api/alerts/{id}`  
**Authentication:** Required (Bearer Token)

### Success Response (200 OK)

```json
{
  "is_success": true,
  "message": "Alert deleted successfully",
  "data": true,
  "status_code": 200,
  "timestamp": "2026-04-16T13:20:00Z"
}
```

---

## Error Handling (Standard)

The API uses standard HTTP status codes and a consistent error response structure.

### Error Example (404 Not Found)

```json
{
  "is_success": false,
  "message": "Alert not found",
  "status_code": 404,
  "errors": ["The requested alert does not exist or you do not have permission to access it."],
  "timestamp": "2026-04-16T13:35:00Z"
}
```

### Common Status Codes

| Code | Meaning               | Reason                               |
| :--- | :-------------------- | :----------------------------------- |
| 200  | OK                    | Success.                             |
| 400  | Bad Request           | Validation error or invalid data.    |
| 401  | Unauthorized          | Missing or invalid Bearer token.     |
| 404  | Not Found             | Record not found.                    |
| 500  | Internal Server Error | Server-side crash or database error. |
