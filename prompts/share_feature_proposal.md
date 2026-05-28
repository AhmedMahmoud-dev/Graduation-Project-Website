# Share Feature Technical Proposal

This document outlines the backend design and endpoints required to implement the sharing feature for the Emotra analysis platform. The goal is to allow users to generate public shareable links for their analyses, allowing even guest users to view the results, while maintaining strict data privacy constraints (specifically omitting original source media files like audio, video, or images).

---

## 1. Core Requirements

1. **User Control**: Owners can generate a share link for any specific analysis.
2. **Revocation**: Owners have a dedicated page showing all currently shared analyses, with the ability to "unshare" (disable) any link instantly.
3. **Public Access with Constraints**: Anyone with the link (including guests/unauthenticated users) can view the analysis.
4. **Media Privacy**: If the shared analysis is an **audio, image, or video** analysis, the original source file is **not** exposed or streamed on the shared results page. Only the calculated results (emotions, charts, transcription, metrics) are visible.

---

## 2. Database Schema Design

To track sharing state without exposing internal primary keys, we will add or use the following columns in the `Analysis` table (or a separate `SharedAnalysis` association table):

*   **`IsShared`** (`Boolean`): Defaults to `false`. Indicates if public sharing is active.
*   **`ShareToken`** (`string`/`Guid`, nullable): A cryptographically secure, random, and unique identifier (e.g., `UUID/GUID`). This token will be embedded in the public sharing URL (e.g., `/shared-analysis/{shareToken}`) to fetch the details without authentication.

---

## 3. Backend Endpoints

### A. Management Endpoints (Authenticated - JWT Required)

These endpoints verify that the requesting user is the actual owner of the targeted analysis.

#### 1. Generate/Enable Share Link
*   **Endpoint**: `POST /api/analysis/{clientId}/share`
*   **Action**: Sets `IsShared = true`, generates a fresh `ShareToken` if empty, and returns the token.
*   **Response**:
    ```json
    {
      "status": "success",
      "data": {
        "shareToken": "d3b07384-d113-4956-a510-4ed33cfd22d4",
        "shareUrl": "/shared-analysis/d3b07384-d113-4956-a510-4ed33cfd22d4"
      }
    }
    ```

#### 2. Revoke Share Link (Unshare)
*   **Endpoint**: `DELETE /api/analysis/{clientId}/share`
*   **Action**: Sets `IsShared = false` and clears/invalidates the `ShareToken` in the database.
*   **Response**:
    ```json
    {
      "status": "success",
      "data": true
    }
    ```

#### 3. List All Active Shared Analyses
*   **Endpoint**: `GET /api/analysis/shared`
*   **Action**: Retrieves all analyses belonging to the authenticated user where `IsShared = true`.
*   **Purpose**: Feeds the "Shared Analyses Management" page in the user's dashboard.
*   **Response**: A list of shared records (IDs, timestamps, type, and active share tokens).

---

### B. Public Access Endpoint (Anonymous - No Auth Required)

#### 4. Get Shared Analysis Details
*   **Endpoint**: `GET /api/analysis/shared/{shareToken}`
*   **Action**: Retrieves the analysis metadata and results only if `IsShared == true` and `ShareToken == shareToken`.
*   **Security Limit (Data DTO)**: 
    *   For **Text** analyses, it returns the standard result payload.
    *   For **Audio, Image, or Video** analyses, the returned JSON **omits** any raw file reference, storage URLs, or file content. Only the processed emotion array, text segments, transcription, and timeline chart data are sent.
*   **Response DTO Example**:
    ```json
    {
      "status": "success",
      "data": {
        "client_id": "d3b07384-d113-4956-a510-4ed33cfd22d4",
        "type": "Audio",
        "timestamp": "2026-05-28T20:15:00Z",
        "result": {
          "audio_emotion": {
            "overall_sentiment": "Positive",
            "duration_seconds": 45.2,
            "emotions_distribution": [
              { "emotion": "Happy", "percentage": 82.5 },
              { "emotion": "Calm", "percentage": 17.5 }
            ]
          },
          "transcription": "This is a transcript of the audio, but the raw audio file itself is excluded."
        }
      }
    }
    ```

---

## 4. Crucial Security Enforcement

To prevent users from discovering the source media files (e.g., extracting the raw audio or video via network inspect tools):

1.  **Strict Media Gateway**: The existing endpoint `GET /api/analysis/media/{id}` must **always** enforce authentication. It must decode the request's Authorization JWT and verify that the user is the original owner.
2.  **No Public Token Media Stream**: Public visitors fetching `/api/analysis/shared/{shareToken}` will have no credentials. Therefore, any backend request they make to fetch binary files must fail immediately with `401 Unauthorized`.
3.  **Frontend Layout**: The shared result page component will check the response. Because no media source URLs are populated, it will suppress the rendering of `<audio>`, `<img>`, or `<video>` player UI elements, showing only the analytical charts and metrics.
