# Public Share Feature API Documentation

This document describes the Public Share Feature for the Emotra analysis platform. It covers all four share-related endpoints, the security model that keeps source media private from anonymous viewers, and how the frontend should integrate sharing into the user experience.

All endpoints return a consistent `ApiResponse<T>` wrapper and use `snake_case` naming conventions for JSON payloads.

---

## 1. How the Feature Works

The Public Share Feature lets an authenticated user generate a cryptographically unguessable, revocable link for any analysis they own. Anyone with the link can view the emotion results — but **never** the original media file.

### Core Rules

| Rule | Detail |
| :--- | :----- |
| **One link per analysis** | An analysis can have at most one active share link at a time. Generating a new link immediately invalidates the previous one. |
| **Instant revocation** | Deleting the share record destroys the token. Old links return `404` immediately — no delay, no caching grace period. |
| **Media isolation** | For Audio, Image, and Video analyses, all file paths, filenames, storage keys (S3/Blob), and source URLs are stripped from the response before it is returned to anonymous viewers. Only numerical emotion data, timelines, transcriptions, and metadata are exposed. |
| **No search indexing** | The frontend page that renders shared analyses must include `<meta name="robots" content="noindex, nofollow">` to prevent search engines from indexing shared links. |
| **No browser caching** | The API sets `Cache-Control: no-store` and `Pragma: no-cache` on the public endpoint so revocation takes effect immediately in all browsers and CDNs. |

---

## 2. Frontend Integration Guide

### A. Share Button (Analysis Detail Page)

When a user views one of their analyses:

1. Check if the analysis is already shared by looking for a `share_token` in the analysis details response (if you surface it) or by calling `GET /api/analysis/shared` and matching `client_id`.
2. If **not shared**: render a **"Share"** button. On click, call `POST /api/analysis/{clientId}/share`.
3. If **already shared**: render a **"Copy Link"** button showing the existing `share_url`, and a **"Revoke"** button that calls `DELETE /api/analysis/{clientId}/share`.
4. On successful `POST`, display the returned `share_url` in a copy-to-clipboard modal.

### B. Shared Analyses Dashboard Panel

On the user profile or a dedicated "Shared" tab:

1. Call `GET /api/analysis/shared` to list all active share links.
2. Render each item with its `type`, `shared_at` timestamp, and a direct link using the `share_token`.
3. Provide a **"Revoke"** button per row that calls `DELETE /api/analysis/{clientId}/share` and refreshes the list.

### C. Public Shared-Analysis Page (Anonymous Route)

The public route (e.g. `/shared-analysis/:shareToken`) must:

1. Call `GET /api/analysis/shared/{shareToken}` **without** an Authorization header.
2. On `200 OK`, render the emotion data contained in `result` according to the `type` field.
3. On `404`, display: *"This link has expired or is no longer available."*
4. Add `<meta name="robots" content="noindex, nofollow">` to the page `<head>`.

---

## 3. General Standards

- **Authentication**: Management endpoints (`POST`, `DELETE`, `GET /shared`) require a valid Bearer JWT token. The public retrieval endpoint (`GET /shared/{shareToken}`) is fully anonymous — send **no** Authorization header.
- **Casing**: All JSON request and response keys use `snake_case`.
- **Response Envelope**:
  ```json
  {
    "is_success": true,
    "message": "...",
    "data": { ... },
    "status_code": 200,
    "timestamp": "2026-05-28T20:00:00Z"
  }
  ```

---

## 4. Share Management Endpoints (Authenticated)

### [POST] /api/analysis/{clientId}/share

**Description**: Enables a public share link for an analysis owned by the authenticated user. If a share link already exists for this analysis, the old token is **destroyed** and a fresh one is returned — immediately invalidating any previously distributed links.

- **Auth**: `[Authorize]` (Requires bearer token)
- **URL Parameter**: `clientId` — the UUID of the analysis (e.g. `e5a26040-70a9-45da-82a0-6c9ba6e195c5`)
- **Request Body**: None
- **Response Data**: `ApiResponse<ShareLinkResponseDto>`
- **Success Response Example**:
  ```json
  {
    "is_success": true,
    "message": "Share link created successfully.",
    "data": {
      "share_token": "d3b07384-d113-4956-a510-4ed33cfd22d4",
      "share_url": "/shared-analysis/d3b07384-d113-4956-a510-4ed33cfd22d4"
    },
    "status_code": 200,
    "timestamp": "2026-05-28T20:01:00Z"
  }
  ```
- **Notes**:
  - Re-calling this endpoint on an already-shared analysis is safe and idempotent from the user's perspective — they always get back a fresh, working token.
  - The `share_url` is a **relative path** intended to be resolved by the frontend host (e.g. `https://emotra.app/shared-analysis/d3b07384-...`).

---

### [DELETE] /api/analysis/{clientId}/share

**Description**: Revokes the active public share link for an analysis owned by the authenticated user. After this call, any visitor who follows the old link will receive a `404` response.

- **Auth**: `[Authorize]` (Requires bearer token)
- **URL Parameter**: `clientId` — the UUID of the analysis
- **Request Body**: None
- **Response Data**: `ApiResponse<bool>`
- **Success Response (link existed and was deleted)**:
  ```json
  {
    "is_success": true,
    "message": "Share link revoked successfully.",
    "data": true,
    "status_code": 200,
    "timestamp": "2026-05-28T20:02:00Z"
  }
  ```
- **Success Response (no active link was found)**:
  ```json
  {
    "is_success": true,
    "message": "No active share link found for this analysis.",
    "data": false,
    "status_code": 200,
    "timestamp": "2026-05-28T20:02:10Z"
  }
  ```
- **Notes**:
  - A `data: false` response is not an error — it simply means the analysis was not shared in the first place.

---

### [GET] /api/analysis/shared

**Description**: Returns all currently active share links belonging to the authenticated user, ordered by most recently shared first. Intended for use in a "Shared Analyses" dashboard panel.

- **Auth**: `[Authorize]` (Requires bearer token)
- **Request Body**: None
- **Response Data**: `ApiResponse<List<ActiveShareResponseDto>>`
- **Success Response Example**:
  ```json
  {
    "is_success": true,
    "message": "Shared analyses retrieved successfully.",
    "data": [
      {
        "client_id": "e5a26040-70a9-45da-82a0-6c9ba6e195c5",
        "share_token": "d3b07384-d113-4956-a510-4ed33cfd22d4",
        "type": "Audio",
        "shared_at": "2026-05-28T20:01:00+00:00",
        "timestamp": "2026-05-20T14:35:00Z"
      },
      {
        "client_id": "a1b2c3d4-0000-0000-0000-111122223333",
        "share_token": "f9e8d7c6-b5a4-3322-1100-aabbccddeeff",
        "type": "Text",
        "shared_at": "2026-05-27T09:15:00+00:00",
        "timestamp": "2026-05-15T08:00:00Z"
      }
    ],
    "status_code": 200,
    "timestamp": "2026-05-28T20:03:00Z"
  }
  ```
- **Field Reference**:

  | Field | Type | Description |
  | :---- | :--- | :---------- |
  | `client_id` | `string (uuid)` | The UUID used to manage this analysis (use in `POST`/`DELETE` share routes) |
  | `share_token` | `string (uuid)` | The public token embedded in the share URL |
  | `type` | `string` | One of: `Text`, `Audio`, `Image`, `Video` |
  | `shared_at` | `datetimeoffset` | When the share link was created |
  | `timestamp` | `datetime` | When the analysis itself was originally created |

---

## 5. Public Retrieval Endpoint (Anonymous)

### [GET] /api/analysis/shared/{shareToken}

**Description**: Publicly accessible — no authentication required. Returns the emotion data for the analysis identified by `shareToken`. All source media references (file paths, filenames, storage keys, blob URLs) are **stripped** from the response before it is returned. If the share link has been revoked, this endpoint returns `404`.

- **Auth**: `[AllowAnonymous]` — **do not** send an Authorization header
- **URL Parameter**: `shareToken` — the UUID token from the share link (e.g. `d3b07384-d113-4956-a510-4ed33cfd22d4`)
- **Request Body**: None
- **Response Headers** (always present):
  ```
  Cache-Control: no-store, no-cache, must-revalidate, max-age=0
  Pragma: no-cache
  ```
- **Response Data**: `ApiResponse<SharedAnalysisDto>`
- **Success Response Example (Text analysis)**:
  ```json
  {
    "is_success": true,
    "message": "Shared analysis retrieved successfully.",
    "data": {
      "client_id": "a1b2c3d4-0000-0000-0000-111122223333",
      "type": "Text",
      "timestamp": "2026-05-15T08:00:00Z",
      "result": {
        "text": "I'm feeling really great about this project!",
        "sentences_count": 1,
        "combined_final_emotion": {
          "label": "joy",
          "confidence": 0.94,
          "confidence_percent": 94.0
        }
      }
    },
    "status_code": 200,
    "timestamp": "2026-05-28T20:04:00Z"
  }
  ```
- **Success Response Example (Audio analysis — media references stripped)**:
  ```json
  {
    "is_success": true,
    "message": "Shared analysis retrieved successfully.",
    "data": {
      "client_id": "e5a26040-70a9-45da-82a0-6c9ba6e195c5",
      "type": "Audio",
      "timestamp": "2026-05-20T14:35:00Z",
      "result": {
        "transcribed_text": "Hello, this is a test recording.",
        "final_multimodal_emotion": {
          "label": "neutral",
          "confidence": 0.81
        },
        "audio_emotion": {
          "dominant_emotion": "neutral",
          "duration_seconds": 12.4,
          "timeline": [
            { "timestamp_offset": 0.0, "dominant": { "label": "neutral", "confidence": 0.85 } },
            { "timestamp_offset": 5.0, "dominant": { "label": "joy",     "confidence": 0.72 } }
          ]
        }
      }
    },
    "status_code": 200,
    "timestamp": "2026-05-28T20:04:15Z"
  }
  ```
  > **Note**: Fields such as `audio_filename`, `storage_path`, `file_name`, `blob_url`, `s3_key`, and similar media reference keys are **automatically removed** from the result before the response is sent. The frontend will never receive a URL that could be used to stream or download the original file.

- **Not-Found Response (link revoked or invalid token)**:
  ```json
  {
    "is_success": false,
    "message": "This link has expired or is invalid.",
    "data": null,
    "status_code": 404,
    "timestamp": "2026-05-28T20:05:00Z"
  }
  ```

---

## 6. Scrubbed Properties Reference

The following JSON property names are stripped from Audio, Image, and Video result payloads before they are returned to anonymous viewers. The scrubbing is applied **recursively** — nested objects are also checked.

| Removed Key | Why |
| :---------- | :-- |
| `audio_filename` / `audiofilename` / `audio_file` | Source audio file name |
| `video_filename` / `videofilename` / `video_file` | Source video file name |
| `image_filename` / `imagefilename` / `image_file` | Source image file name |
| `storage_path` / `storagepath` / `storage_key` | Internal storage path or object key |
| `file_path` / `filepath` / `file_name` / `filename` | Generic file path or name |
| `source_path` / `sourcepath` / `upload_path` | Upload directory references |
| `blob_url` / `blob_key` | Azure Blob Storage identifiers |
| `s3_key` / `s3_url` | AWS S3 object identifiers |
| `media_url` / `media_path` | Generic media URL or path |

> **Text analyses are not scrubbed** — they contain no binary media references.

---

## 7. Error Codes & Messages

| Status | Scenario | Message |
| :----- | :------- | :------ |
| **200** | Share created or re-generated | `"Share link created successfully."` |
| **200** | Share revoked | `"Share link revoked successfully."` |
| **200** | No active link on revoke | `"No active share link found for this analysis."` |
| **401** | Missing or invalid JWT token | `"Unauthorized"` |
| **403** | Authenticated user does not own the analysis | `"You do not have permission to share this analysis."` |
| **404** | Analysis does not exist | `"Analysis not found."` |
| **404** | Share token is revoked or never existed | `"This link has expired or is invalid."` |
| **500** | Unexpected server error | `"Failed to create share link."` / `"Failed to retrieve shared analysis."` |
