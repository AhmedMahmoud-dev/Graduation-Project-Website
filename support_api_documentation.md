# Support API Documentation

This document outlines the endpoints for managing support contact messages and administrative replies. All responses follow the unified `ApiResponse<T>` structure with `snake_case` naming conventions for JSON serialization.

---

## 1. Submit Support Message (User)

Allows a user to submit a contact/support request.

**Endpoint:** `POST /api/support/contact`  
**Authentication:** Required (Bearer Token)

### Request Body

```json
{
  "subject": "App Crash on Login",
  "message": "The app consistently crashes when I try to log in using my Google account. Please investigate."
}
```

### Success Response (200 OK)

```json
{
  "is_success": true,
  "message": "Support message submitted successfully.",
  "data": {
    "id": 12,
    "subject": "App Crash on Login",
    "message": "The app consistently crashes when I try to log in using my Google account. Please investigate.",
    "status": "pending",
    "created_at": "2026-05-01T14:30:00Z"
  },
  "status_code": 200,
  "timestamp": "2026-05-01T14:30:00Z"
}
```

### Error Cases

- **400 Bad Request**: Validation failed (e.g., missing subject or message).
- **401 Unauthorized**: Missing or invalid token.

---

## 2. Get User Support Messages (User)

Retrieves a history of support messages submitted by the current user, including admin replies.

**Endpoint:** `GET /api/support/contact`  
**Authentication:** Required (Bearer Token)

### Success Response (200 OK)

```json
{
  "is_success": true,
  "message": "Success",
  "data": [
    {
      "id": 12,
      "subject": "App Crash on Login",
      "message": "The app consistently crashes when I try to log in using my Google account. Please investigate.",
      "status": "replied",
      "created_at": "2026-05-01T14:30:00Z",
      "reply": "We have identified the issue with Google login and a fix will be deployed in the next hour.",
      "replied_at": "2026-05-01T15:15:00Z"
    },
    {
      "id": 10,
      "subject": "Feature Request: Dark Mode",
      "message": "Please add a dark mode option to the settings.",
      "status": "pending",
      "created_at": "2026-04-30T10:00:00Z",
      "reply": null,
      "replied_at": null
    }
  ],
  "status_code": 200,
  "timestamp": "2026-05-01T15:20:00Z"
}
```

---

## 3. Get Support Queue (Admin)

Retrieves a paginated list of all support messages for administrative review. Supports filtering by status.

**Endpoint:** `GET /api/admin/support`  
**Authentication:** Required (Admin Only)

### Query Parameters

- `page`: (int) The page number to retrieve. Default: `1`.
- `pageSize`: (int) Number of items per page. Default: `10` (max 50).
- `status`: (string) Filter by status (`pending` or `replied`).

### Success Response (200 OK)

```json
{
  "is_success": true,
  "message": "Success",
  "data": {
    "items": [
      {
        "id": 12,
        "user_id": "user-uuid-123",
        "user_name": "Ahmed Mahmoud",
        "user_email": "ahmed@example.com",
        "subject": "App Crash on Login",
        "message": "The app consistently crashes when I try to log in using my Google account. Please investigate.",
        "status": "pending",
        "created_at": "2026-05-01T14:30:00Z",
        "replied_at": null
      }
    ],
    "page": 1,
    "page_size": 10,
    "total_count": 1
  },
  "status_code": 200,
  "timestamp": "2026-05-01T14:45:00Z"
}
```

---

## 4. Reply to Support Message (Admin)

Sends a reply to a user's support message. This action automatically creates a notification alert for the user and updates the message status to `replied`.

**Endpoint:** `POST /api/admin/support/{id}/reply`  
**Authentication:** Required (Admin Only)

### Request Body

```json
{
  "message": "We have fixed the issue. Please try logging in again."
}
```

### Success Response (200 OK)

```json
{
  "is_success": true,
  "message": "Reply sent successfully.",
  "data": {
    "id": 12,
    "status": "replied",
    "replied_at": "2026-05-01T15:15:00Z"
  },
  "status_code": 200,
  "timestamp": "2026-05-01T15:15:00Z"
}
```

### Error Cases

- **400 Bad Request**: Message has already been replied to or validation failed.
- **404 Not Found**: Support message ID not found.

---

## Error Handling

All support endpoints use the standard platform error structure:

```json
{
  "is_success": false,
  "message": "Error description",
  "status_code": 400,
  "errors": ["Specific error detail 1", "Specific error detail 2"],
  "timestamp": "2026-05-01T15:00:00Z"
}
```
