# Backend Specification: Server-Side Filtering, Sorting, and Pagination for Admin Users

## Overview
Currently, the frontend `AdminUsersComponent` utilizes a "fetch-all" strategy, requesting up to 1000 users at a time and performing all filtering, sorting, and pagination in-memory on the client side. This approach is not scalable, consumes unnecessary bandwidth, and can lead to performance degradation on the client side as the user base grows.

To ensure scalability and performance, we need to transition to **server-side processing**. The backend must handle all pagination, filtering, and sorting directly within the database query.

## Target Endpoint Updates
**Endpoint:** `GET /api/admin/users`

The endpoint must be updated to accept the following query parameters to support the frontend requirements.

### Required Query Parameters

| Parameter | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `page` | `int` | `1` | The current page number (1-based index). |
| `pageSize` | `int` | `10` | The number of records to return per page. |
| `search` | `string` | `null` | A search string to match against multiple user fields. |
| `status` | `string` | `"all"` | Filters users by their current status. |
| `sortBy` | `string` | `null` | The field name to sort the results by. |
| `sortOrder` | `string` | `"asc"` | The direction of the sort (`"asc"` or `"desc"`). |

---

## Detailed Requirements

### 1. Search Logic (`search` parameter)
The frontend search input is a unified field. When a `search` string is provided, the backend must perform a case-insensitive `LIKE` (or `.Contains()` in EF Core) query across the following fields simultaneously:
*   `Id` (User ID)
*   `FirstName` + `LastName` (Full name)
*   `Email`

**C# / EF Core Concept:**
```csharp
if (!string.IsNullOrWhiteSpace(request.Search))
{
    var searchTerm = request.Search.ToLower().Trim();
    query = query.Where(u => 
        u.Id.ToLower().Contains(searchTerm) ||
        (u.FirstName + " " + u.LastName).ToLower().Contains(searchTerm) ||
        u.Email.ToLower().Contains(searchTerm)
    );
}
```

### 2. Status Filtering (`status` parameter)
The frontend requires the ability to filter users by their current status. The `status` parameter will map to specific database states:

*   `"all"`: Returns all users (no filter applied).
*   `"online"`: Returns active users who are currently online.
    *   *Condition:* `IsActive == true && IsOnline == true`
*   `"offline"`: Returns active users who are currently offline.
    *   *Condition:* `IsActive == true && IsOnline == false`
*   `"banned"`: Returns users who have been suspended/banned.
    *   *Condition:* `IsActive == false`

**C# / EF Core Concept:**
```csharp
switch (request.Status?.ToLower())
{
    case "online":
        query = query.Where(u => u.IsActive && u.IsOnline);
        break;
    case "offline":
        query = query.Where(u => u.IsActive && !u.IsOnline);
        break;
    case "banned":
        query = query.Where(u => !u.IsActive);
        break;
    case "all":
    default:
        // No filtering needed
        break;
}
```

### 3. Sorting (`sortBy` and `sortOrder` parameters)
The backend must support dynamic sorting based on the requested column.

**Allowed `sortBy` values (mapped from frontend):**
*   `"first_name"`: Sort by FirstName.
*   `"created_at"`: Sort by creation date (Newest/Oldest).
*   `"total_analyses"`: Sort by the user's total usage/analyses count.
*   `"is_active"`: Sort by status.

**C# / EF Core Concept:**
```csharp
if (!string.IsNullOrWhiteSpace(request.SortBy))
{
    bool isDesc = request.SortOrder?.ToLower() == "desc";
    
    query = request.SortBy.ToLower() switch
    {
        "first_name" => isDesc ? query.OrderByDescending(u => u.FirstName) : query.OrderBy(u => u.FirstName),
        "created_at" => isDesc ? query.OrderByDescending(u => u.CreatedAt) : query.OrderBy(u => u.CreatedAt),
        "total_analyses" => isDesc ? query.OrderByDescending(u => u.TotalAnalyses) : query.OrderBy(u => u.TotalAnalyses),
        "is_active" => isDesc ? query.OrderByDescending(u => u.IsActive) : query.OrderBy(u => u.IsActive),
        _ => query.OrderByDescending(u => u.CreatedAt) // Default sort
    };
}
else
{
    // Default fallback
    query = query.OrderByDescending(u => u.CreatedAt);
}
```

### 4. Pagination & Response Structure
The endpoint must return a paginated response that includes the total count of records (after filtering, but before pagination) so the frontend can calculate total pages.

**Expected Response Model:**
```csharp
public class PaginatedAdminResponse<T>
{
    public bool IsSuccess { get; set; }
    public string Message { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
    public int Total { get; set; } // Total matching records for pagination UI
    public T Data { get; set; }    // The array of users for the current page
}
```

## Summary of Action Items for Backend
1.  Update the `GET /api/admin/users` controller action to accept the new query parameters.
2.  Implement EF Core LINQ queries to handle the `search` logic across ID, Name, and Email.
3.  Implement the `status` filter mapping (`online`, `offline`, `banned`).
4.  Implement dynamic sorting (`OrderBy` / `OrderByDescending`).
5.  Ensure pagination (`Skip` and `Take`) is applied **last**, after all filtering and sorting.
6.  Ensure the `Total` property in the response accurately reflects the number of records *after* filtering, to support accurate frontend pagination controls.