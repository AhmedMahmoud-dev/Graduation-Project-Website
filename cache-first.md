# Cache-First Strategy Guide (Emotra)

This document outlines the **Cache-First** (and Stale-While-Revalidate) logic used across the Emotra platform. Use this standard pattern when creating new components that interact with analysis data or user preferences to ensure maximum performance and reduced API costs.

## 1. The Goal
The primary objective is to make the application feel **instant**. By prioritizing browser-side storage (`localStorage`), we eliminate loading spinners for data the user has already generated or viewed on their current device.

---

## 2. Core Pattern: Analysis Data (Cache-First)

This pattern is used in **Analysis Pages (Text/Audio)** and the **Compare Page**.

### Step-by-Step Logic
1.  **Check Local Storage**: Look for the item using a unique key (e.g., `emotra_text_sessions`).
2.  **Lookup by ID**:
    *   First try the **Unique Client ID** (UUID/string).
    *   If not found, try the **Cloud ID** (Numeric/integer).
3.  **Branching**:
    *   **IF FOUND**: Load the data into the UI immediately. No API call is made.
    *   **IF NOT FOUND**: 
        *   Show a small loader.
        *   Call the API fallback (e.g., `analysisV2Service.getAnalysisDetails(id)`).
        *   On success: **Map** the API data to the standard internal structure, **Save** it to the cache, and then **Display** it.

### Code Example Implementation
```typescript
ngOnInit() {
  const id = this.route.snapshot.params['id'];
  
  // 1. Try local lookup via Storage Service
  const localSession = this.storageService.getSessionById(id);
  
  if (localSession) {
    this.displayData(localSession); // Instant UI
  } else {
    // 2. API Fallback
    this.isLoading.set(true);
    this.apiService.getDetails(id).subscribe(res => {
      // 3. Normalize structure before saving/showing
      const standardized = this.mapToInternalFormat(res.data);
      this.storageService.saveSession(standardized);
      this.displayData(standardized);
      this.isLoading.set(false);
    });
  }
}
```

---

## 3. Core Pattern: Stats & Lists (Stale-While-Revalidate)

This pattern is used in the **Dashboard** and **History** lists.

### Step-by-Step Logic
1.  **Read Cache**: Immediately check if a cached version of the list/dashboard exists.
2.  **Instant UI**: Render the cached data immediately so the user sees results without a spinner.
3.  **Background Refresh**: Simultaneously fire an API call to get the latest data.
4.  **Silent Update**: When the fresh data arrives, replace the UI state and update the cache silently.

---

## 4. Standard Data Structure
To ensure Cache-First works across different pages (Compare, History, Alerts), all analysis objects saved in `localStorage` **must** follow this naming convention:

| Property | Type | Description |
| :--- | :--- | :--- |
| `id` | `string` | The local UUID (Client ID). |
| `cloudId` | `number` | The database ID (from the API). |
| `type` | `string` | 'text' or 'audio'. |
| `result` | `object` | The full analysis payload from the model. |

> [!IMPORTANT]
> **Avoid Inconsistency**: Never save raw API response objects directly into local storage arrays. Always use a mapping function to ensure the property names match the table above (`id` instead of `client_id`).

---

## 5. Benefits
*   **Zero Latency**: Previous results load in < 10ms.
*   **Offline Support**: Users can view their history without an internet connection.
*   **Cost Efficiency**: Reduces redundant database queries and server load.
*   **Reliability**: If the API is momentarily down, the user can still see their local history.
