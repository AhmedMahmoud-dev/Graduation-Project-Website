# Admin API Documentation

This document outlines the System Feedback, Support (Bug Reports), and Administration endpoints. All responses follow the unified `ApiResponse<T>` structure with `snake_case` naming conventions for JSON keys.

---

## 2. Support Endpoints

### 2.1 Report a Bug

Submits a technical issue or bug report.

- **Endpoint:** `POST /api/support/bug-report`
- **Authentication:** Required (Bearer Token)

#### Request Body

- `title`: (string) Short summary of the bug.
- `description`: (string) Detailed steps to reproduce or behavior.
- `category`: (string) e.g., "UI/UX", "Analysis Error", "Login Issue".
- `priority`: (string) "Low", "Medium", "High".
- `metadata`: (object, optional) Context like browser version or screen size.

```json
{
  "title": "Sidebar overlap on mobile",
  "description": "The sidebar covers the main content when viewed on iPhone 13.",
  "category": "UI/UX",
  "priority": "Medium",
  "metadata": {
    "viewport": "390x844",
    "browser": "Safari"
  }
}
```

#### Success Response (200 OK)

```json
{
  "is_success": true,
  "message": "Bug report submitted successfully. Thank you for your feedback!",
  "data": 42,
  "status_code": 200
}
```

---

## 3. Admin Endpoints

All admin endpoints require a token with `Admin` role.

### 3.1 Get Platform Statistics

Retrieves high-level overview of the platform performance and growth.

- **Endpoint:** `GET /api/admin/stats`
- **Authentication:** Admin Only

#### Success Response (200 OK)

```json
{
  "is_success": true,
  "data": {
    "total_users": 1500,
    "active_users": 1200,
    "total_analyses": 45000,
    "total_bug_reports": 12,
    "analysis_trend": [{ "date": "2026-04-30", "count": 450 }],
    "emotion_distribution": { "joy": 40, "sadness": 10 }
  }
}
```

---

### 3.2 User Management

List all users and their status.

- **Endpoint:** `GET /api/admin/users`
- **Authentication:** Admin Only

---

### 3.3 Update User Status (Ban/Activate)

Bans or activates a user account.

- **Endpoint:** `PATCH /api/admin/users/{id}/status`
- **Body:** `true` (activate) or `false` (ban).

---

### 3.4 Manage Bug Reports

- `GET /api/admin/bugs`: List all bug reports.
- `PATCH /api/admin/bugs/{id}/status`: Update status (e.g., "In Progress", "Fixed", "Closed").

---

### 3.5 Testimonial Moderation

Manage public feedback submissions.

#### Get Pending Testimonials

- **Endpoint:** `GET /api/admin/testimonials/pending`

#### Moderate Testimonial (Approve/Reject)

- **Endpoint:** `POST /api/admin/testimonials/{id}/moderate`
- **Body:** `true` (approve) or `false` (reject).

---

### 3.6 AI Infrastructure Health

Checks the status of connected AI microservices (Text, Audio, Video).

- **Endpoint:** `GET /api/admin/health`
- **Authentication:** Admin Only

#### Success Response

```json
{
  "is_success": true,
  "data": [
    {
      "service_name": "Text Emotion Engine",
      "status": "Online",
      "response_time_ms": 45,
      "last_checked_at": "2026-04-30T19:50:00Z"
    }
  ]
}
```
