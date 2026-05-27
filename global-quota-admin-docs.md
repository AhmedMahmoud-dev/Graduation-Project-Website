# Global Quota Management API Documentation (Admin)

This documentation describes the administrative endpoints for managing system-wide default quota limits. Use these endpoints to implement the Admin Dashboard feature that allows setting limits for all users simultaneously.

## Overview

The Global Quota system allows an administrator to change the "Default" limits for the entire platform. 
**Crucial Behavior:** When the global limits are updated via the `PATCH` endpoint, the system automatically:
1.  Updates the global defaults in the database.
2.  **Clears all individual user overrides** (any custom limits set for specific users are deleted to ensure everyone follows the new global standard).
3.  **Updates active quotas:** All users currently in an active week will see their limits change immediately.

---

## 1. Get Global Quota Defaults
Retrieve the current system-wide default limits.

- **Endpoint:** `GET /api/admin/quota/global`
- **Authentication:** Required (Role: `Admin`)
- **Description:** Returns the default values used for all users who do not have custom overrides.

### Response Examples

**Success (200 OK)**
```json
{
  "is_success": true,
  "message": "Global quota settings retrieved successfully.",
  "data": {
    "text_tokens_limit": 5000,
    "audio_seconds_limit": 300.0,
    "video_seconds_limit": 300.0,
    "image_count_limit": 10
  },
  "status_code": 200
}
```

---

## 2. Update Global Quota Defaults
Update the system-wide default limits and apply them to all users.

- **Endpoint:** `PATCH /api/admin/quota/global`
- **Authentication:** Required (Role: `Admin`)
- **Description:** Updates the global defaults. **Warning:** This will reset any custom limits previously set for individual users.

### Request Body
All fields are optional; only provided fields will be updated.

```json
{
  "text_tokens_limit": 10000,
  "audio_seconds_limit": 600.0,
  "video_seconds_limit": 600.0,
  "image_count_limit": 20
}
```

### Response Examples

**Success (200 OK)**
```json
{
  "is_success": true,
  "message": "Global quota limits updated and all user overrides cleared.",
  "data": true,
  "status_code": 200
}
```

**Error (400 Bad Request)**
```json
{
  "is_success": false,
  "message": "Request body is required.",
  "data": false,
  "status_code": 400
}
```

---

## Instructions for Frontend Implementation

1.  **Admin Dashboard UI:** Create a "System Limits" or "Global Quotas" section in the Admin settings.
2.  **Initial Load:** Call `GET /api/admin/quota/global` to populate the form fields with the current platform defaults.
3.  **Form Validation:**
    *   `text_tokens_limit`: Positive Integer.
    *   `audio_seconds_limit`: Positive Number (seconds).
    *   `video_seconds_limit`: Positive Number (seconds).
    *   `image_count_limit`: Positive Integer.
4.  **Submission:** Use the `PATCH` method. Since this operation is "destructive" to individual custom limits, it is recommended to show a confirmation dialog:
    > "Updating global limits will reset all custom user overrides to these new values. Do you wish to proceed?"
5.  **State Management:** After a successful update, the next time any user (or the admin viewing a user) checks a quota status, the new limits will be reflected. No manual reset is required by the users.

## Related Documentation
- For individual user quota status: See `Prompts/quota-system-docs.md`.
- For specific user quota overrides: See `AdminController.cs` (`PATCH /api/admin/users/{id}/quota`).
