# Backend & Frontend Specification: Selective History Wiping by Media Type

## Overview

Currently, the **User History** page has a "Clear All" button that triggers a permanent wipe of the user's entire analysis history via the `DELETE /api/analysis/clear` endpoint.

To enhance user control, we need to make this clear operation **selective based on the currently active tab** in the history page. When the user is viewing a specific tab (e.g., Text, Audio, Image, Video) and clicks the clear button:
1. The frontend verification modal must dynamically specify exactly what will be deleted.
2. The frontend will invoke the backend clear endpoint with a type query parameter.
3. The backend will selectively delete only records of that specific type for the user.

---

## 1. Backend API Enhancement

### Endpoint: `DELETE /api/analysis/clear`

Add an optional query parameter `type` to selectively clear records matching that category.

### Query Parameters

| Parameter | Type     | Default | Description |
| :-------- | :------- | :------ | :---------- |
| `type`    | `string` | `null`  | Selective clear type. Valid values: `Text`, `Audio`, `Image`, `Video`, or `All`/`null`. |

### Backend Logic Requirements (.NET / EF Core)

1.  **Authorize & Isolate:** Ensure the database operation is strictly filtered by the authenticated user ID (`CurrentUserId`).
2.  **Selective Filtering:**
    *   If `type` is not provided, is null, or is `"All"` (case-insensitive):
        ```csharp
        // Clear all analyses for the user
        await _dbContext.Analyses
            .Where(a => a.UserId == currentUserId)
            .ExecuteDeleteAsync();
        ```
    *   If `type` is one of `Text`, `Audio`, `Image`, or `Video` (case-insensitive):
        ```csharp
        // Clear only the specified analysis type for the user
        await _dbContext.Analyses
            .Where(a => a.UserId == currentUserId && a.Type == type)
            .ExecuteDeleteAsync();
        ```
3.  **Cascade Delete / Clean up Assets:** Ensure related files (e.g., uploaded media files associated with the deleted records) are also removed from storage.
4.  **Response:** Return a standard `ApiResponse<bool>`:
    ```json
    {
      "is_success": true,
      "message": "Selected analysis logs cleared successfully.",
      "data": true
    }
    ```

---

## 2. Frontend User Interface Details

The frontend confirmation popup/modal should adapt dynamically depending on the current active tab:

### Tab Wiping Configurations

| Active Tab | Target Clear Action | API Request URL | Verification Modal Prompt Message |
| :--- | :--- | :--- | :--- |
| **All Tracks (`all`)** | Clear all analyses | `DELETE /api/analysis/clear` | *"This will delete EVERY session in your history. This action is irreversible."* |
| **Text (`text`)** | Clear text analyses | `DELETE /api/analysis/clear?type=Text` | *"This will delete EVERY Text analysis session in your history. This action is irreversible."* |
| **Audio (`audio`)** | Clear audio analyses | `DELETE /api/analysis/clear?type=Audio` | *"This will delete EVERY Audio analysis session in your history. This action is irreversible."* |
| **Image (`image`)** | Clear image analyses | `DELETE /api/analysis/clear?type=Image` | *"This will delete EVERY Image analysis session in your history. This action is irreversible."* |
| **Video (`video`)** | Clear video analyses | `DELETE /api/analysis/clear?type=Video` | *"This will delete EVERY Video analysis session in your history. This action is irreversible."* |

---

## 3. Cache Invalidation Requirements (Frontend & Backend)

When a selective clear is executed, cache keys must be invalidated selectively to prevent out-of-date states:

*   **If Clearing Specific Type (e.g., `Text`):**
    *   Remove `emotra_history_meta_text` (if text was cleared) or corresponding key.
    *   Remove `emotra_history_meta_all` (since "All" list also contains text items).
    *   Remove `emotra_stats`.
    *   Wipe individual analysis detail keys for the deleted sessions.
*   **If Clearing All (`All`):**
    *   Wipe all history-related caches (`emotra_history_meta_*`, `emotra_stats`, detail keys).

---

## Action Items for the Backend Agent

1.  **Update API Controller:** Modify the action method for `DELETE /api/analysis/clear` to accept `[FromQuery] string? type`.
2.  **Update Repository / Service layer:** Parse the `type` parameter and implement the conditional Linq query.
3.  **Verify User Scopes:** Guarantee that no other users' data can be modified.
