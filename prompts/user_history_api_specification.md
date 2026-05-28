# Backend Specification: Server-Side Filtering, Searching, and Sorting (User History & Feedback)

## Overview

Currently, the **User History** page implements a "Load More" pagination pattern. However, searching and sorting are performed client-side on the currently loaded chunk of data. This causes several bugs:

1.  **Incomplete Search:** Searching for a term only finds results within the already loaded logs, not the entire database.
2.  **Incorrect Sorting:** Sorting only reorders the visible logs rather than fetching the true "Oldest" or "Newest" records from the database.
3.  **Counter Mismatch:** The "Total Logs" count and "Load More" calculations become inaccurate once a search filter is applied client-side.

To fix this, the backend must implement server-side processing for both the **Analysis History** and **Feedback History** endpoints.

---

## 1. Analysis History Endpoint

**Endpoint:** `GET /api/analysis/history`

This endpoint serves the main history timeline, supporting filtering by media type.

### Query Parameters

| Parameter   | Type     | Default  | Description                                   |
| :---------- | :------- | :------- | :-------------------------------------------- |
| `page`      | `int`    | `1`      | 1-based page index.                           |
| `pageSize`  | `int`    | `10`     | Records per page.                             |
| `type`      | `string` | `null`   | Filter by: `Text`, `Audio`, `Image`, `Video`. |
| `search`    | `string` | `null`   | Search query for results.                     |
| `sortOrder` | `string` | `"desc"` | `"asc"` (Oldest) or `"desc"` (Newest).        |

### Logic Requirements

- **Search:** Perform a case-insensitive search across `SummaryText` (which contains the text snippet or filename) and `DominantEmotion`.
- **Sorting:** Always sort by the `Timestamp` field based on `sortOrder`.
- **Pagination:** Apply `Skip` and `Take` after filtering and sorting.
- **Total Count:** The `Total` property in the response must reflect the count of all records matching the `type` and `search` filters for the authenticated user.

---

## 2. Feedback History Endpoint

**Endpoint:** `GET /api/system-feedback/me`

This endpoint serves the "Feedback" tab, which aggregates analysis reviews and system testimonials.

### Query Parameters

| Parameter   | Type     | Default  | Description                            |
| :---------- | :------- | :------- | :------------------------------------- |
| `page`      | `int`    | `1`      | 1-based page index.                    |
| `pageSize`  | `int`    | `10`     | Records per page.                      |
| `search`    | `string` | `null`   | Search query for reviews.              |
| `sortOrder` | `string` | `"desc"` | `"asc"` (Oldest) or `"desc"` (Newest). |

### Logic Requirements

- **Search:** Perform a case-insensitive search across the `Comment` field and the `FeedbackType` (searching for "system" or "analysis").
- **Sorting:** Always sort by the `CreatedAt` field based on `sortOrder`.
- **Total Count:** The `Total` property must reflect the filtered count of the user's unified feedback items.

---

## Standard Response Structure

Both endpoints must return a paginated response. It is critical that `Total` is the count of **all matching records** in the database (after filters), not just the count of items in the `Data` array.

```csharp
public class PaginatedResponse<T>
{
    public bool IsSuccess { get; set; }
    public string Message { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
    public int Total { get; set; } // CRITICAL: Used for "Load X More" calculation
    public T Data { get; set; }    // The list of items
}
```

## Summary of Action Items for Backend

1.  **Unified Pattern:** Apply the same server-side logic used in the Admin API to these user-facing endpoints.
2.  **User Isolation:** Ensure all queries are strictly filtered by the `CurrentUserId`.
3.  **Accurate Totals:** Ensure the `Total` count updates dynamically as the user types in the search box or changes filters.
4.  **Consistency:** The search and sort fields must match the frontend fields (`SummaryText`, `DominantEmotion`, `Comment`) to ensure the UI remains intuitive.
