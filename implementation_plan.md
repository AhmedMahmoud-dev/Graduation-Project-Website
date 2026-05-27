# Implementation Plan - Fix Admin Users Pagination and Filtering

This plan addresses the issue where search queries and status filters on the Admin Users page return empty states or miss users located on different pages. 

## The Problem
Currently, the Admin Users page fetches a single page (e.g., 10 users) from the server. The search and status filters are applied client-side using `computed` properties, but they only filter the users of the *current page*. Consequently:
- If a user search or status filter is applied and no matching users exist on the first page, the page displays an empty state, even if matching users exist on page 2 or page 3.
- Sorting is limited to the current page's users rather than the full list.
- Pagination is computed based on the total unfiltered user count, resulting in empty/misaligned pages when filters are active.

## Proposed Solution
Since the backend API does not currently support server-side search or filtering (taking only `page` and `pageSize` parameters), we will implement client-side pagination, filtering, and sorting over the **entire user dataset**.

1. **Load All Users**: We will fetch all users from the server on page load (and on Refresh click). We'll make an initial request with a large page size (e.g., `1000`). If the server caps the page size (e.g., to 50), we will dynamically detect this and fetch the remaining pages in parallel using `forkJoin`.
2. **Client-Side Filtering & Sorting**: Filter and sort the entire dataset of users reactively using the existing `filteredUsers` and `sortedUsers` signals.
3. **Client-Side Slicing (Pagination)**: Add a new `paginatedUsers` computed signal to slice the sorted and filtered list for the current page.
4. **Auto-Reset Page**: Reset the pagination page to `1` whenever search queries or status filters change to avoid empty views.

---

## Proposed Changes

### [Admin Users Component]

#### [MODIFY] [admin-users.component.ts](file:///c:/Users/Ahmed%20Mahmoud/Desktop/Graduation%20Project/Project%20Website/src/app/features/admin/admin-users/admin-users.component.ts)
- Import `forkJoin` from `'rxjs'`.
- Modify `fetchUsers()` to query all pages in parallel if the server enforces a smaller page size limit.
- Add `updateSearchQuery(q)` and `updateStatusFilter(status)` methods to reset `currentPage` to `1` when filters change.
- Modify `totalPages` to compute page count based on `filteredUsers().length`.
- Add `paginatedUsers` computed signal to slice the list for the current page.
- Modify `goToPage(page)` to simply set the `currentPage` signal without triggerring a server request.

#### [MODIFY] [admin-users.component.html](file:///c:/Users/Ahmed%20Mahmoud/Desktop/Graduation%20Project/Project%20Website/src/app/features/admin/admin-users/admin-users.component.html)
- Change `<app-search-input>` to bind `(valueChange)` to `updateSearchQuery($event)`.
- Change `<app-dropdown-menu>` (status filter) to bind `(selectedValueChange)` to `updateStatusFilter($event)`.
- Update desktop and mobile list iterators (`@for`) to loop over `paginatedUsers()` instead of `sortedUsers()`.

---

## Verification Plan

### Automated/Build Verification
- Run `npm run build` or `ng build` to ensure there are no compilation or TypeScript errors.

### Manual Verification
- Apply the **Online** status filter: verify that online users from any page are gathered onto the first page, and that pagination dynamically scales.
- Search for a specific user known to be on page 2 or 3: verify they appear instantly on page 1.
- Verify sorting (e.g., by Name, Joined) works across the entire filtered list.
- Click the **Refresh** button to verify the complete user list syncs in the background.
