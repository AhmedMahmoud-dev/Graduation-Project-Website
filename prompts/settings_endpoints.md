# Settings API Documentation

This document outlines the API endpoints for user preferences/settings (specifically Appearance and Colors). All responses follow the unified `ApiResponse<T>` structure and use strict `snake_case` naming conventions.

---

## 1. Get User Appearance Settings

Retrieves the active color and theme preferences for the user. If the user hasn't saved custom settings before, the backend should return `null` for the data or a 404/empty state so the frontend can fallback to default. Alternatively, the backend could return the default settings.

**Endpoint:** `GET /api/settings/appearance`  
**Authentication:** Required (Bearer Token)

### Success Response (200 OK)

```json
{
  "is_success": true,
  "message": "Settings retrieved successfully",
  "data": {
    "light_theme": {
      "color_bg": "#ffffff",
      "color_surface": "#f8f9fc",
      "color_border": "#e2e8f0",
      "color_text": "#1a1a2e",
      "color_text_muted": "#64748b",
      "color_primary": "#6c63ff",
      "color_accent": "#00d4aa"
    },
    "dark_theme": {
      "color_bg": "#020617",
      "color_surface": "#0b0f21",
      "color_border": "#2a2a3d",
      "color_text": "#e2e8f0",
      "color_text_muted": "#64748b",
      "color_primary": "#6c63ff",
      "color_accent": "#00d4aa"
    },
    "emotion_colors": {
      "anger": "#ff4757",
      "disgust": "#a29bfe",
      "fear": "#fd9644",
      "joy": "#ffd32a",
      "neutral": "#778ca3",
      "sadness": "#4a90d9",
      "surprise": "#00d4aa"
    },
    "active_theme": "dark"
  },
  "status_code": 200,
  "errors": null,
  "timestamp": "2026-04-14T23:30:00Z"
}
```

_Note on keys:_ The keys like `color_bg` in the payload should map to CSS variables like `--color-bg` in the frontend application.

---

## 2. Update User Appearance Settings

Saves or updates the user's color and theme preferences. The request allows partial updates if necessary, but ideally, the frontend will send the complete settings object.

**Endpoint:** `PUT /api/settings/appearance`  
**Authentication:** Required (Bearer Token)

### Request Body

```json
{
  "light_theme": {
    "color_bg": "#ffffff",
    "color_surface": "#f8f9fc",
    "color_border": "#e2e8f0",
    "color_text": "#1a1a2e",
    "color_text_muted": "#64748b",
    "color_primary": "#6c63ff",
    "color_accent": "#00d4aa"
  },
  "dark_theme": {
    "color_bg": "#020617",
    "color_surface": "#0b0f21",
    "color_border": "#2a2a3d",
    "color_text": "#e2e8f0",
    "color_text_muted": "#64748b",
    "color_primary": "#6c63ff",
    "color_accent": "#00d4aa"
  },
  "emotion_colors": {
    "anger": "#ff4757",
    "disgust": "#a29bfe",
    "fear": "#fd9644",
    "joy": "#ffd32a",
    "neutral": "#778ca3",
    "sadness": "#4a90d9",
    "surprise": "#00d4aa"
  },
  "active_theme": "system"
}
```

### Success Response (200 OK)

```json
{
  "is_success": true,
  "message": "Settings updated successfully",
  "data": true,
  "status_code": 200,
  "errors": null,
  "timestamp": "2026-04-14T23:35:00Z"
}
```

---

## 3. Reset User Appearance Settings to Default

Clears the custom settings for the user, restoring them to application defaults on the backend.

**Endpoint:** `DELETE /api/settings/appearance`  
**Authentication:** Required (Bearer Token)

### Success Response (200 OK)

```json
{
  "is_success": true,
  "message": "Settings reset to default successfully",
  "data": true,
  "status_code": 200,
  "errors": null,
  "timestamp": "2026-04-14T23:40:00Z"
}
```

---

## Error Handling (Standard for all endpoints)

If an error occurs, the response will follow the standard `ApiResponse<T>` format.

### Error Example (400 Bad Request)

This might happen if invalid hex strings are submitted.

```json
{
  "is_success": false,
  "message": "Failed to update settings",
  "data": null,
  "status_code": 400,
  "errors": ["Invalid hex code format for 'color_primary'", "Invalid hex code format for anger emotion color"],
  "timestamp": "2026-04-14T23:42:05Z"
}
```

### Common Status Codes

| Code    | Meaning               | Reason                                         |
| :------ | :-------------------- | :--------------------------------------------- |
| **200** | OK                    | Success.                                       |
| **400** | Bad Request           | Validation error (e.g., malformed hex colors). |
| **401** | Unauthorized          | Missing or invalid Bearer token.               |
| **500** | Internal Server Error | Database or server-side crash.                 |
