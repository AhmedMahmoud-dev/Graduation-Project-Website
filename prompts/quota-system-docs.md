# User Weekly Quota & Limits API Documentation

This document outlines the User Weekly Quota and Limit system. It describes the endpoints, the weekly reset logic, and how the frontend should integrate this system to handle user limits seamlessly.

All endpoints return a consistent `ApiResponse<T>` wrapper and use `snake_case` naming conventions for JSON payloads.

---

## 1. How the Frontend Uses This System

The weekly quota system prevents users from overusing expensive computation (e.g. text model tokens or video processing seconds). It checks usage independently of analysis history logs, meaning that clearing history or deleting an analysis will **never refund** used quota.

The frontend should integrate the quota check in two main areas:

### A. Pre-Analysis Gating (Frontend Blocking)
Before the user begins an analysis (e.g., clicking "Start Analysis" or uploading a media file):
1. Send a `GET /api/analysis/quota` request.
2. Under the corresponding analysis type block (`text`, `audio`, `video`, `image`), inspect the `is_blocked` flag.
3. If `is_blocked` is `true`, disable the "Start Analysis" button and show a message: *"You have reached your weekly limit for [Type] analysis. Your quota resets next Monday."*
4. Optionally, for media uploads, if the media duration/size is known beforehand, check if `media_duration > remaining` and block if it exceeds the remaining quota.

### B. Usage Dashboard (Visual Tracker)
On the user profile page or analysis dashboards:
1. Call `GET /api/analysis/quota` to fetch current stats.
2. Display a progress bar for each analysis type (e.g. Text: `4,000 / 5,000 tokens`, Audio: `180 / 300 seconds`).
3. Show the `remaining` quota clearly to keep users informed.

---

## 2. General Standards

- **Reset Interval**: Quota limits reset automatically every **Monday at 00:00:00 UTC**.
- **Casing**: JSON request and response keys use `snake_case`.
- **Response Envelope**:
  ```json
  {
    "is_success": true,
    "message": "Success",
    "data": { ... },
    "status_code": 200,
    "timestamp": "2026-05-27T02:30:00Z"
  }
  ```

---

## 3. User-Facing Endpoints

### [GET] /api/analysis/quota

**Description**: Retrieves the active weekly usage and limit metrics for the authenticated user.

- **Auth**: `[Authorize]` (Requires bearer token)
- **Response Data**: `ApiResponse<UserQuotaStatusDto>`
- **Response Example**:
  ```json
  {
    "is_success": true,
    "message": "User quota retrieved successfully",
    "data": {
      "week_start_date": "2026-05-25T00:00:00Z",
      "text": {
        "used": 4000,
        "limit": 5000,
        "remaining": 1000,
        "is_blocked": false
      },
      "audio": {
        "used": 120.5,
        "limit": 300.0,
        "remaining": 179.5,
        "is_blocked": false
      },
      "video": {
        "used": 60.0,
        "limit": 60.0,
        "remaining": 0.0,
        "is_blocked": true
      },
      "image": {
        "used": 8,
        "limit": 10,
        "remaining": 2,
        "is_blocked": false
      }
    },
    "status_code": 200,
    "timestamp": "2026-05-27T02:32:00Z"
  }
  ```

---

## 4. Admin-Facing Endpoints

Administrative controls to monitor user usage and override limits dynamically.

### [GET] /api/admin/users/{userId}/quota

**Description**: Fetches the weekly quota usage and customized limits for a specific user.

- **Auth**: `[Authorize(Policy = "AdminOnly")]` (Requires admin role)
- **Response Data**: `ApiResponse<UserQuotaStatusDto>`

---

### [PATCH] /api/admin/users/{userId}/quota

**Description**: Updates (overrides) the default/current limits for a specific user. This immediately changes the limits for the active week and sets the default limits for future weeks.

- **Auth**: `[Authorize(Policy = "AdminOnly")]` (Requires admin role)
- **Request Body**:
  ```json
  {
    "text_tokens_limit": 10000,
    "audio_seconds_limit": 600.0,
    "video_seconds_limit": 120.0,
    "image_count_limit": 20
  }
  ```
- **Response Data**: `ApiResponse<bool>`
  ```json
  {
    "is_success": true,
    "message": "User quota limits updated successfully.",
    "data": true,
    "status_code": 200,
    "timestamp": "2026-05-27T02:35:00Z"
  }
  ```

---

## 5. Error Codes & Messages

| Status  | Scenario       | Generic Message                                                  |
| :------ | :------------- | :--------------------------------------------------------------- |
| **400** | Limit Exceeded | "Weekly limit exceeded for [type] analysis."                     |
| **401** | Missing Token  | "Unauthorized"                                                   |
| **403** | Forbidden      | "Access Denied: Weekly quota reached."                           |
| **404** | User Not Found | "The requested user account was not found."                      |
| **500** | System Error   | "Failed to process quota status check."                          |
