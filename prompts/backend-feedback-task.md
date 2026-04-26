# Task: Feedback System Refactor & Migration to V2

## 🎯 Objective

Migrate the existing feedback endpoints to align with the **Analysis V2** architecture and implement a new **System Feedback** (Testimonials) feature.

## 🛠️ General Standards (Mandatory)

1.  **JSON Casing**: Strictly use `snake_case` for ALL request and response payloads.
2.  **Identifiers**: All references to analyses must use the **`analysis_id`** (UUID/string), which corresponds to the `client_id` in the `AnalysisV2` table.
3.  **Response Envelope**: Standardize all responses using the following structure:
    ```json
    {
      "is_success": true,
      "message": "Descriptive and professional message.",
      "data": { ... } // Or null/array
    }
    ```
4.  **Error Handling**: Every error (400, 404, 409, etc.) MUST return a descriptive, professional message explaining the failure.

---

## 🚀 1. Refactor Existing Analysis Feedback

Modify the following endpoints to use the V2 UUID system and `snake_case`.

### [POST] `/api/feedback`

- **Request Body**: `{ "analysis_id": string, "rating": int, "comment": string }`
- **Logic**:
  - Look up analysis by `client_id`.
  - Ensure the analysis belongs to the authenticated user.
  - Validate that feedback doesn't already exist for this analysis (`1:1` constraint).
  - Only allow feedback if the analysis status is "Completed".
- **Errors**:
  - `404`: "The specified analysis record could not be found."
  - `409`: "A feedback entry already exists for this analysis."
  - `400`: "Feedback can only be submitted for completed analyses."

### [GET] `/api/feedback/{analysis_id}`

- **Path**: Change from `/api/feedback/analysis/{id}` to `/api/feedback/{analysis_id}`.
- **Logic**: Return a **single object** directly. Remove all paging logic for this endpoint.
- **Error**: `404` if no feedback exists for that specific `analysis_id`.

### [DELETE] `/api/feedback/{id}`

- **Logic**: Delete the record and return a standard `snake_case` success envelope.

---

## 🌟 2. Implementation: System Feedback & Testimonials

Implement a new system for general platform-wide feedback.

### [POST] `/api/system-feedback`

- **Purpose**: General platform review/experience.
- **Request Body**: `{ "rating": int, "comment": string, "is_public": boolean }`
- **Logic**: Save to a new (or existing) system feedback table.

### [GET] `/api/system-feedback/testimonials` (Public)

- **Purpose**: Data source for the landing page.
- **Logic**: Return a list of feedback where `is_public` is **true**.
- **Response Shape**: `{ "user_name": string, "rating": int, "comment": string, "created_at": string }`

### [GET] `/api/system-feedback/me` (Authenticated)

- **Purpose**: Unified history of all feedback provided by the user.
- **Logic**: This must return **ALL** feedback (both System Feedback and Analysis Feedback).
- **Required Field**: Each item in the list must include a `feedback_type` field (`"system"` or `"analysis"`) and the `analysis_id` (if type is analysis).
- **Sorting**: Newest first.

---

## 🔒 Security

- Use `[Authorize]` on all endpoints except `/api/system-feedback/testimonials`.
---

## 🚀 3. Advanced Technical Logic & Critical Scenarios

To ensure a production-ready and professional implementation, the following technical constraints must be strictly followed:

### 3.1 Data Integrity & Referential Rules
*   **Foreign Key Constraint**: Analysis Feedback must maintain a structural link to the `AnalysisV2` table.
*   **Critical Scenario: Analysis Deletion**: 
    *   **Problem**: If an analysis is deleted while it has a linked feedback record, the DB will throw a Foreign Key violation.
    *   **Fix**: Modify the `AnalysisV2` deletion logic (in the controller or service) to handle this. You MUST implement a **Cascade Delete** strategy—either via the database configuration or by explicitly deleting the feedback record before the analysis is removed.
*   **Idempotency (1:1 Logic)**: Implement a `Unique` constraint in the database for the combination of `(UserId, AnalysisId)`. If a user attempts to post feedback for the same analysis twice, return a professional `409 Conflict` error.

### 3.2 Professional Logic & Validations
*   **State-Aware Feedback**: The system must NOT allow feedback for analyses that are still "Processing" or have "Failed". Verify the `status` is `"Completed"` before saving.
*   **System Feedback Upsert**: For the System Feedback (`/api/system-feedback`), if a user already has an entry, allow them to **update** their existing rating/comment rather than creating a second one. Use `updated_at` to track changes.

### 3.3 Calculation & Enrichment Requirements
*   **Testimonial Stats**: The `GET /api/system-feedback/testimonials` endpoint should include a summary object in the response:
    ```json
    {
      "stats": { 
        "average_rating": 4.8, 
        "total_reviews": 150 
      },
      "items": [...]
    }
    ```
*   **Unified Feed Mapping**: For the `/api/system-feedback/me` endpoint, you must query both tables and map them to a shared `UnifiedFeedbackDto` with a `feedback_type` discriminator. Ensure `analysis_id` is only non-null for analysis-type records.

### 3.4 Professional Error Handling Examples
Every error must return a descriptive message. Examples:
- **409 Conflict**: "A feedback entry already exists for this analysis record."
- **400 Bad Request**: "Feedback can only be submitted for completed analyses."
- **404 Not Found**: "The requested feedback record could not be located."
- **403 Forbidden**: "You do not have permission to modify this feedback record."

