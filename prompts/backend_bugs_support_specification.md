# Backend Specification: Server-Side Filtering, Sorting, and Pagination (Bugs & Support)

## Overview
To align with the professional standards of the Admin Users page, the **Bug Reports** and **Support Queue** endpoints must be updated to handle filtering, sorting, and pagination on the server side. 

**Note:** Unlike the Users endpoint, these two modules **do not require a search parameter**. They focus strictly on categorical filters and date-based sorting.

---

## 1. Bug Reports Endpoint
**Endpoint:** `GET /api/admin/bugs`

### Required Query Parameters

| Parameter | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `page` | `int` | `1` | Page number. |
| `pageSize` | `int` | `10` | Records per page. |
| `status` | `string` | `"all"` | Filter by status: `Open`, `In Progress`, `Closed`. |
| `priority` | `string` | `"all"` | Filter by priority: `Low`, `Medium`, `High`. |
| `category` | `string` | `"all"` | Filter by category name (e.g., `UI`, `Functional`, etc.). |
| `sortBy` | `string` | `"created_at"` | Field: `title`, `priority`, `status`, `created_at`. |
| `sortOrder` | `string` | `"desc"` | `asc` or `desc`. |

---

## 2. Support Queue Endpoint
**Endpoint:** `GET /api/admin/support`

### Required Query Parameters

| Parameter | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `page` | `int` | `1` | Page number. |
| `pageSize` | `int` | `10` | Records per page. |
| `status` | `string` | `"all"` | Filter by status: `open` (Pending), `pending`, `replied`. |
| `sortBy` | `string` | `"created_at"` | Field: `subject`, `status`, `created_at`. |
| `sortOrder` | `string` | `"desc"` | `asc` or `desc`. |

---

## Implementation Details

### Sorting Mapping
The backend should handle the `sortBy` parameter by mapping it to the following database fields:

**Bug Reports:**
*   `title` -> `Title`
*   `priority` -> `Priority` (Mapped to an integer/enum weight: High=3, Medium=2, Low=1)
*   `status` -> `Status`
*   `created_at` -> `CreatedAt`

**Support Queue:**
*   `subject` -> `Subject`
*   `status` -> `Status`
*   `created_at` -> `CreatedAt`

### Response Structure
Both endpoints must return the standard paginated response. The `Total` field must represent the total number of records matching the filters **before** pagination is applied.

```csharp
public class PaginatedAdminResponse<T>
{
    public bool IsSuccess { get; set; }
    public string Message { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
    public int Total { get; set; } // Total filtered records
    public T Data { get; set; }    // Current page records
}
```

## Summary of Action Items for Backend
1.  **Remove Search:** Ensure no search logic is implemented for these endpoints as it is not needed.
2.  **Filter Logic:** Implement `Where` clauses for `status`, `priority`, and `category` as specified.
3.  **Sort Logic:** Implement dynamic `OrderBy` based on the requested column and direction.
4.  **Pagination:** Apply `Skip((page-1)*pageSize).Take(pageSize)` at the end of the query.
5.  **Total Count:** Return the count of records that match the active filters to the frontend.
