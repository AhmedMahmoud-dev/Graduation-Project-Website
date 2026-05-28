# Detailed Frontend Implementation Plan: History & Feedback Professional Refactor

## 1. Structural Alignment Analysis
After deep analysis of the `AdminUsersComponent`, `AdminBugsComponent`, and `AdminSupportComponent`, we are standardizing the **History Page** to fully match the Admin dashboard's architectural pattern. This includes transitioning from a cumulative "social-media style" list to a professional **Numbered Pagination** system.

### Final Target Architecture
| Feature | Old History Logic | New Standard (Admin Style) |
| :--- | :--- | :--- |
| **Search** | Client-side (In-memory) | **Server-side (Debounced)** |
| **Sorting** | Client-side (In-memory) | **Server-side (Database-driven)** |
| **Pagination** | Cumulative (Append / Load More) | **Windowed (Replace / Numbered Pagination)** |
| **Total Count** | Fixed or Client-calculated | **Server-reported (Filter-aware)** |
| **Feedback Tab** | Independent Internal State | **Parent-Synced State** |

---

## 2. Implementation Details: `HistoryComponent`

### 2.1 State Management (Signals)
We will maintain the following signals to match the Admin modules:
*   `messages` (or `analyses`): Signal of records for the **current page only**.
*   `_serverTotal`: Signal of the total records matching active filters on the server.
*   `currentPage`: Signal for the active page index (1-based).
*   `pageSize`: Signal fixed at 10 (matching Admin defaults).
*   `searchQuery`, `filterType`, `sortOrder`: Signals representing the active filter state.

### 2.2 Standardized Numbered Pagination
*   **Component**: Integrate the `PaginationComponent` (`<app-pagination>`) at the bottom of the list.
*   **Removal**: Delete all "Load More" logic, including the cumulative `_loadedItems` array and the remaining count calculations.
*   **Navigation**: Implement `goToPage(page: number)` which updates `currentPage` and calls `fetchPage()`.

### 2.3 The "Deep Refetch" Trigger
We will implement a unified trigger logic using `toObservable` and `RxJS`:
1.  **Debounced Search**: Monitor `searchQuery` with `debounceTime(500)`.
2.  **Immediate Filters**: Monitor `filterType` and `sortOrder`.
3.  **Reset Logic**: Whenever any of these change, we will reset `currentPage = 1` and call `fetchPage()`.

### 2.4 Fetching Logic (`fetchPage`)
*   **Behavior**: Each fetch will **replace** the current list of items, not append.
*   **Total Logs Count**: The "Total Logs" indicator in the header will directly use `_serverTotal()`. Since the backend now calculates the count based on the *active* filters, this number will dynamically update as the user searches or changes tabs.

---

## 3. Implementation Details: `FeedbackHistoryListComponent`

The child component will also be refactored to match the numbered pagination style:
1.  **Component Standardisation**: Replace its internal "Load More" button with the `<app-pagination>` component.
2.  **Pure View Logic**: It will react to `searchQuery` and `sortOrder` inputs from the parent, immediately resetting to page 1 and fetching fresh data from the server.
3.  **Server-Side Sync**: Update `FeedbackService.getMyFeedbackHistory` to handle `search` and `sortOrder` query parameters.

---

## 4. Step-by-Step Implementation Roadmap

### Phase 1: Service Layer Standardisation
*   Update `AnalysisV2Service.getHistory` and `FeedbackService.getMyFeedbackHistory` to support `search`, `sortBy`, and `sortOrder`.
*   Ensure both return the standard `PaginatedResponse` (Success, Message, Page, PageSize, Total, Data).

### Phase 2: History Component Core Refactor (Admin Style)
*   **Imports**: Add `PaginationComponent` to the imports array.
*   **Template**: Replace the "Load More" button with `<app-pagination>`.
*   **Logic**: 
    *   Refactor `fetchPage` to replace data rather than append.
    *   Implement debounced search monitoring in the constructor.
    *   Implement `goToPage()` and update `totalPages` computed signal.

### Phase 3: Feedback Tab Refactor
*   Apply the exact same Numbered Pagination refactor to the `FeedbackHistoryListComponent`.
*   Remove all "cumulative" logic and "Load More" button.

### Phase 4: UI Polish & Verification
*   Verify "Total Logs" header updates correctly.
*   Ensure the pagination component disappears if `total < pageSize`.
*   Verify that changing the sort order from "Newest" to "Oldest" correctly fetches the first page of the oldest records.
