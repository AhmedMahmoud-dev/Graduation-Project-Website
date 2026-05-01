# Admin Dashboard API Documentation

This document specifies the internal administration endpoints. Access to these endpoints requires a JWT token with the `Admin` role.

## Base URL

`https://<your-api-domain>/api/admin`

## Request Headers

| Header          | Value                       |
| :-------------- | :-------------------------- |
| `Authorization` | `Bearer <your_admin_token>` |
| `Content-Type`  | `application/json`          |

---

## 1. Platform Statistics

Provides an overview of users, analyses, and system trends.

- **Endpoint:** `GET /stats`
- **Method:** `GET`

### Success Response (200 OK)

```json
{
  "is_success": true,
  "message": "Success",
  "data": {
    "total_users": 1500,
    "active_users": 1450,
    "total_analyses": 8540,
    "total_bug_reports": 25,
    "analysis_trend": [
      { "date": "2026-04-30T00:00:00", "count": 120 },
      { "date": "2026-04-29T00:00:00", "count": 95 }
    ],
    "new_users_trend": [{ "date": "2026-04-30T00:00:00", "count": 10 }],
    "emotion_distribution": {
      "joy": 450,
      "sadness": 120,
      "anger": 85,
      "surprise": 200
    }
  },
  "status_code": 200
}
```

---

## 2. User Management

### 2.1 List All Users

Retrieves a paginated list of registered users.

- **Endpoint:** `/users`
- **Method:** `GET`
- **Query Parameters:**
  - `page`: (int, default 1)
  - `pageSize`: (int, default 10)

### Success Response (200 OK)

```json
{
  "is_success": true,
  "message": "User list retrieved successfully",
  "data": [
    {
      "id": "user-guid-1",
      "first_name": "John",
      "last_name": "Doe",
      "email": "john@example.com",
      "is_active": true,
      "created_at": "2026-01-15T10:00:00Z",
      "total_analyses": 45
    }
  ],
  "status_code": 200,
  "page": 1,
  "page_size": 10,
  "total": 150
}
```

---

### 2.2 Update User Status (Ban/Unban)

Instantly activates or deactivates a user's account.

- **Endpoint:** `/users/{id}/status`
- **Method:** `PATCH`
- **Request Body:** `true` to activate, `false` to ban (boolean).

---

## 3. Bug Report Management

### 3.1 List All Bug Reports

Retrieves a paginated list of technical issues.

- **Endpoint:** `/bugs`
- **Method:** `GET`
- **Query Parameters:**
  - `page`: (int, default 1)
  - `pageSize`: (int, default 10)

### Success Response (200 OK)

```json
{
  "is_success": true,
  "message": "Bug reports retrieved successfully",
  "data": [
    {
      "id": 42,
      "title": "Analysis button not clicking",
      "description": "...",
      "category": "UI/UX",
      "priority": "High",
      "status": "Open",
      "created_at": "2026-04-30T12:00:00Z",
      "submitted_by": "Ahmed Mohamed",
      "user_email": "Ahmed@test.com"
    }
  ],
  "status_code": 200,
  "page": 1,
  "page_size": 10,
  "total": 25
}
```

---

### 3.2 Update Bug Status

Updates the progress of a bug report.

- **Endpoint:** `/bugs/{id}/status`
- **Method:** `PATCH`
- **Request Body:** "In Progress", "Fixed", or "Closed" (string).

---

## 4. Testimonial Moderation

### 4.1 List Pending Testimonials

Retrieves public feedback that requires moderation.

- **Endpoint:** `/testimonials/pending`
- **Method:** `GET`
- **Query Parameters:**
  - `page`: (int, default 1)
  - `pageSize`: (int, default 10)

### Success Response (200 OK)

```json
{
  "is_success": true,
  "data": [...],
  "page": 1,
  "page_size": 10,
  "total": 5
}
```

---

### 4.2 Moderate Testimonial

Approves or rejects a testimonial.

- **Endpoint:** `/testimonials/{id}/moderate`
- **Method:** `POST`
- **Request Body:** `true` to Approve, `false` to Reject (boolean).

---

## 5. Infrastructure Health

Monitors the real-time status of connected AI Microservices.

- **Endpoint:** `/health`
- **Method:** `GET`

### Success Response (200 OK)

```json
{
  "is_success": true,
  "data": [
    {
      "service_name": "Text Analysis Service",
      "status": "Online",
      "response_time_ms": 45,
      "last_checked_at": "2026-04-30T21:00:00Z"
    },
    {
      "service_name": "Audio Inference Engine",
      "status": "Offline",
      "response_time_ms": 0,
      "last_checked_at": "2026-04-30T21:00:00Z"
    }
  ]
}
```
