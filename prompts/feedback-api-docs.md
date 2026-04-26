# Feedback API Redesign Documentation (v2)

This document outlines the audit of the existing feedback system and the proposed redesign to align with the **Analysis V2** architecture.

## 1. Current State (v1)

### [POST] `/api/feedback`
*   **What it does**: Creates a new feedback entry for a specific analysis.
*   **Request Body**:
    ```json
    {
      "analysisId": 123,
      "rating": 5,
      "comment": "Helpful results"
    }
    ```
*   **Response Shape**: `ApiResponse<FeedbackDto>` (CamelCase properties).
*   **What is Broken**:
    *   **ID System**: It requires an `integer` analysis ID. The V2 analysis system encourages using `client_id` (UUID strings).
    *   **Casing**: Uses `CamelCase` in JSON, which is inconsistent with the `snake_case` standard adopted in V2.

### [GET] `/api/feedback/analysis/{analysisId}`
*   **What it does**: Fetches all feedback for a specific analysis.
*   **Request/Param**: `analysisId` (int) + Query Params (`page`, `pageSize`).
*   **Response Shape**: `ApiResponse<PagedResponse<FeedbackDto>>`.
*   **What is Broken/Wrong**:
    *   **Naming**: The route `/analysis/{id}` is redundant and inconsistent with common REST patterns (usually `/api/feedback/{analysis_id}`).
    *   **Over-engineering**: It returns a **Paged List**, yet the backend logic (`FeedbackService.cs:39`) explicitly prevents a user from submitting more than one feedback per analysis. It should return a single object.
    *   **V1 Dependency**: Limited to integer IDs.

### [DELETE] `/api/feedback/{id}`
*   **What it does**: Deletes a feedback entry by its internal ID.
*   **Request/Param**: `id` (int - the feedback's own ID).
*   **Response Shape**: `ApiResponse<bool>`.
*   **What is Broken**:
    *   No major functional breakage, but lacks `snake_case` consistency in the wrapping response.

---

## 2. What Needs to Change

### Fixes for V2 Migration
1.  **Transition to `client_id`**: Feedback operations must now identify analyses using the **`client_id`** (UUID string). This ensures the frontend can post feedback using the same ID it used to create the analysis, providing a seamless "idempotent" experience.
2.  **Consistency**: Rename the GET endpoint and remove the `/analysis/` prefix.
3.  **Data Shape**: Standardize on **`snake_case`** for all JSON fields.

### Missing/Obsolete Endpoints
*   **Remove**: The paging logic from the GET endpoint. It adds unnecessary complexity to the frontend for a 1:1 relationship.
*   **Add**: `GET /api/feedback` (Optional) — To allow users to see a list of all feedback they've provided across all their analyses.

### The ID Decision: `client_id` (UUID) vs `id` (Integer)
**Decision**: Feedback will reference the **`client_id`** (UUID/String).
**Reasoning**:
*   **Frontend-First**: In V2, the client generates the ID. Using it for feedback means the frontend doesn't have to wait for a backend database ID before allowing the user to rate the experience.
*   **Consistency**: Aligns with `AnalysisV2` which uses `client_id` for idempotency and lookup.
*   **Security**: UUIDs prevent "Id Enumeration" attacks where a user could guess integer IDs of other people's analyses to see their feedback.

---

## 3. Final Redesigned Endpoints

### [POST] `/api/feedback`
Submits a rating and comment for a specific analysis results.
*   **Request Body**:
    *   `analysis_id` (string): The UUID client_id of the analysis.
    *   `rating` (int): Number from 1 to 5.
    *   `comment` (string, optional): Maximum 2000 characters.
*   **Success Response** (200 OK):
    ```json
    {
      "is_success": true,
      "message": "Feedback submitted successfully",
      "data": {
        "id": 1,
        "analysis_id": "550e8400-e29b-41d4-a716-446655440000",
        "rating": 5,
        "comment": "Very accurate!",
        "created_at": "2024-04-17T14:30:00Z"
      }
    }
    ```
*   **Errors**:
    *   `404`: Analysis not found or doesn't belong to the user.
    *   `400`: Feedback already exists for this analysis, or analysis is not yet "Completed".

### [GET] `/api/feedback/{analysis_id}`
Retrieves the feedback provided for a specific analysis.
*   **Parameters**: `analysis_id` (string/UUID).
*   **Success Response** (200 OK):
    ```json
    {
      "is_success": true,
      "data": {
        "id": 1,
        "analysis_id": "550e8400-e29b-41d4-a716-446655440000",
        "rating": 5,
        "comment": "Very accurate!",
        "created_at": "2024-04-17T14:30:00Z"
      }
    }
    ```
*   **Errors**:
    *   `404`: No feedback found for this analysis_id.

### [GET] `/api/feedback` (Optional)
Retrieves a paginated list of all feedback submitted by the current user.
*   **Query Params**: `page` (int), `limit` (int).
*   **Success Response**:
    ```json
    {
      "is_success": true,
      "data": [
        { "id": 1, "analysis_id": "...", "rating": 4, "comment": "Good", "created_at": "..." }
      ],
      "total": 50,
      "page": 1,
      "limit": 10
    }
    ```

### [DELETE] `/api/feedback/{id}`
Removes a feedback entry.
*   **Parameters**: `id` (int) — The internal ID of the feedback entry.
*   **Success Response**:
    ```json
    {
      "is_success": true,
      "message": "Feedback deleted successfully"
    }
    ```
