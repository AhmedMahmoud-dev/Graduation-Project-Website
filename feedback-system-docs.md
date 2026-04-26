# Feedback & System Testimonials API Documentation

This document outlines the refactored Feedback system for Analysis V2 and the new Platform Testimonial System. All endpoints follow the standard `snake_case` naming convention for JSON payloads and use the `ApiResponse<T>` wrapper.

## 1. General Standards

- **Identification**: All analysis records are identified via their `client_id` (UUID string), NOT the internal integer ID.
- **Casing**: Request bodies and response data use `snake_case`.
- **Response Wrapper**: All responses return a consistent envelope:
  ```json
  {
    "is_success": true,
    "message": "Success",
    "data": { ... },
    "status_code": 200,
    "timestamp": "2026-04-17T..."
  }
  ```

---

## 2. Analysis Feedback Endpoints

Endpoints for users to review specific analysis results.

### [POST] /api/feedback

**Description**: Submits a review for an analysis.

- **Rules**:
  - Analysis must belong to the authenticated user.
  - Analysis status must be `Completed`.
  - Only one feedback record allowed per analysis (1:1 constraint).
- **Auth**: `[Authorize]` (Requires token)
- **Request Body**:
  ```json
  {
    "analysis_id": "uuid-string-here",
    "rating": 5,
    "comment": "Very accurate results!"
  }
  ```
- **Response Data**: `ApiResponse<FeedbackDto>`
  ```json
  {
    "id": 1,
    "analysis_id": "uuid-string-here",
    "rating": 5,
    "comment": "Very accurate results!",
    "created_at": "2026-04-18T12:00:00Z"
  }
  ```
- **Responses**:
  - `200`: Success.
  - `400`: Invalid status (e.g., analysis still in progress).
  - `404`: Analysis not found.
  - `409`: Feedback already exists for this analysis.

### [GET] /api/feedback/{analysis_id}

**Description**: Retrieves the feedback associated with a specific analysis.

- **Response Data**:
  ```json
  {
    "id": 10,
    "analysis_id": "uuid-string",
    "rating": 5,
    "comment": "string",
    "created_at": "2026-04-17T..."
  }
  ```

### [DELETE] /api/feedback/{id}

**Description**: Deletes a feedback record by its internal integer ID.

- **Response Data**: `ApiResponse<bool>`
  ```json
  {
    "is_success": true,
    "message": "Feedback deleted successfully",
    "data": true,
    "status_code": 200,
    "timestamp": "2026-04-18T12:00:00Z"
  }
  ```

---

## 3. System Feedback (Testimonials)

Endpoints for platform-wide reviews and public landing page content.

### [POST] /api/system-feedback

**Description**: Submits or updates a platform-wide review.

- **Auth**: `[Authorize]` (Requires token)
- **Strategy**: **Upsert**. If the user has already submitted a system review, this endpoint will update the existing record.
- **Request Body**:
  ```json
  {
    "rating": 5,
    "comment": "This platform transformed my workflow.",
    "is_public": true
  }
  ```
- **Response Data**: `ApiResponse<SystemFeedbackDto>`
  ```json
  {
    "id": 1,
    "rating": 5,
    "comment": "This platform transformed my workflow.",
    "is_public": true,
    "created_at": "2026-04-18T12:00:00Z"
  }
  ```

### [GET] /api/system-feedback/testimonials

**Description**: Public endpoint for the landing page. Returns all public reviews and statistics, with pagination.

- **Auth**: `[AllowAnonymous]` (No token required).
- **Query Params**:
  - `page`: Page number (default: 1)
  - `limit`: Items per page (default: 10)
- **Response Data**:
  ```json
  {
    "is_success": true,
    "message": "Success",
    "data": {
      "stats": {
        "average_rating": 4.8,
        "total_reviews": 150
      },
      "items": [
        {
          "user_name": "John Doe",
          "rating": 5,
          "comment": "Amazing tool!",
          "created_at": "2026-04-17T..."
        }
      ]
    },
    "total": 150,
    "page": 1,
    "page_size": 10,
    "status_code": 200,
    "timestamp": "2026-04-17T..."
  }
  ```

### [GET] /api/system-feedback/me

**Description**: Retrieves a unified feed of ALL feedback submitted by the current user (both Analysis reviews and System reviews), with pagination.

- **Auth**: `[Authorize]` (Requires token)
- **Query Params**:
  - `page`: Page number (default: 1)
  - `limit`: Items per page (default: 10)
- **Response Data**:
  ```json
  {
    "is_success": true,
    "message": "Success",
    "data": [
      {
        "id": 1,
        "feedback_type": "analysis",
        "analysis_id": "uuid-string",
        "rating": 5,
        "comment": "Great analysis",
        "is_public": null,
        "created_at": "2026-04-17T..."
      },
      {
        "id": 5,
        "feedback_type": "system",
        "analysis_id": null,
        "rating": 5,
        "comment": "Great platform",
        "is_public": true,
        "created_at": "2026-04-16T..."
      }
    ],
    "total": 5,
    "page": 1,
    "page_size": 10,
    "status_code": 200,
    "timestamp": "2026-04-17T..."
  }
  ```

---

## 4. Error Codes & Messages

| Status  | Scenario       | Generic Message                                          |
| :------ | :------------- | :------------------------------------------------------- |
| **400** | Invalid Input  | "Feedback can only be submitted for completed analyses." |
| **401** | Missing Token  | "Unauthorized"                                           |
| **404** | Record Missing | "The specified analysis record could not be found."      |
| **409** | Conflict       | "A feedback entry already exists for this analysis."     |
| **500** | Tech Failure   | "Failed to save system feedback."                        |
