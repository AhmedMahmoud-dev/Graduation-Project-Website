# Bug Report: Navigation & ID Inconsistency in Feedback History

## Overview
The "Open & Edit" button in the Analysis History page (specifically under the Feedback tab) intermittently fails after a user logs out and logs back in. Additionally, the application currently uses a mixture of Database Integer IDs and Client-side UUIDs for analysis reporting, leading to navigation failures when local caches are cleared.

## Root Cause Analysis

### 1. ID Mapping Discrepancy
The application uses two different identifiers for the same analysis session:
- **`client_id` (UUID)**: Generated on the frontend during analysis. Used as the primary key in `localStorage` (`AnalysisStorageService`).
- **`id` (Integer)**: Assigned by the .NET backend after the report is synced to the cloud.

The bug stems from how these IDs are used across different pages:
- **History List (`HistoryComponent`)**: Uses the **Integer ID** for the "Open Report" button. This works even after logout because the result page can fetch the report from the backend using this ID.
- **Feedback History List (`FeedbackHistoryListComponent`)**: Uses the **UUID** (`analysis_id`) returned by the `/api/system-feedback/me` endpoint.

### 2. Session Recovery Failure
The Result pages (`TextAnalysisComponent` and `AudioAnalysisComponent`) have a "Session Recovery" logic in their `ngOnInit` with a critical flaw:

```typescript
// From TextAnalysisComponent.ngOnInit (approx lines 180-205)
let session = this.storageService.getSessionById(id); // Tries UUID lookup in localStorage
if (!session) {
  const numericId = parseInt(id, 10);
  if (isNaN(numericId)) {
    // If it's a UUID string and not in cache, REDIRECT TO INPUT
    this.router.navigate(['/analysis/text']);
    return;
  }
  // If it's an integer, fallback to API fetch
  this.analysisV2Service.getAnalysisDetails(numericId).subscribe(...)
}
```

### 3. Data Flow during Logout/Login
1.  **Logout**: `AuthService.logout()` clears all `localStorage` keys starting with `emotra_`. This wipes `emotra_text_sessions` and `emotra_audio_sessions` (the UUID-indexed cache).
2.  **Login**: User logs in. Local storage is empty.
3.  **Feedback Tab**: The feedback list is fetched from the API. The `analysis_id` for each item is a **UUID string**.
4.  **Navigation**: Clicking "Open & Edit" navigates to `/analysis/text/<UUID>`.
5.  **Failure**: Since the UUID is not in the (now empty) local storage, and it is not a valid integer for `parseInt()`, the component assumes it is an invalid ID and redirects the user to the start (input page).
- **Auto-Scroll Failure**: Because the navigation hits a redirect loop or is canceled in favor of a new navigation, the `router.getCurrentNavigation()?.extras.state` containing the `scrollToFeedback` flag is lost. This is why the page fails to scroll down to the feedback section when navigating from the Feedback History page.

## Observed Symptoms
1.  **"Open Report" (History Tab)**: Works consistently because it uses the Integer ID (e.g., `/analysis/text/127`), which triggers the cloud fetch logic.
2.  **"Open & Edit" (Feedback Tab)**: Works in a single session (because the UUID is in cache) but fails after re-login (because the UUID is not in cache, and the code refuses to fetch by UUID from the backend).
3.  **URL Inconsistency**: URLs alternate between `/analysis/text/127` and `/analysis/text/e443148c-03b9-4888-b890-bc7faa567c5a`.

## Other Identified Bugs

### 1. Authenticated Call on Logout
Immediately after logout, the console shows a 401 Unauthorized error for `GET /api/system-feedback/me`.

**Root Cause**:
The `LandingComponent` (which is the target of the logout redirect) contains several components (`FooterSectionComponent`, `SystemFeedbackComponent`) that call `isAuthenticated()` in their `ngOnInit` to check if they should fetch user-specific feedback.
While `AuthService.logout()` clears the `currentUser` signal and navigating, the re-initialization of these components on the landing page may occasionally trigger before the authentication state is fully stabilized or because of race conditions in shared services.

### 2. Mandatory Login for Landing Page (Bug)
The user reported that after logout, they are sometimes redirected to the login page when trying to access the landing page.

**Root Cause**:
In `app.routes.ts`, there are two routes with `path: ''`:
1.  `{ path: '', component: LandingComponent, pathMatch: 'full' }` (Public)
2.  `{ path: '', component: AppLayoutComponent, canActivate: [authGuard], children: [...] }` (Protected)

If a user navigates to `/` but the routing system for some reason skips the first match or if there is a trailing slash/internal redirect that hits the second match, the `authGuard` will trigger a redirect to `/auth/login`.

## Recommended Fixes (For Developers)
- **ID Inconsistency**: Update the backend `GET /api/analysis/{id}` endpoint to support lookup by `client_id` (UUID). Update frontend Result pages to allow API fetching even if the `id` is a non-numeric UUID.
- **Logout API Call**: Ensure all background feedback fetches in `ngOnInit` check `isAuthenticated()` and specifically check for a non-null token in the `AuthService` before execution.
- **Landing Redirect**: Review the route priority in `app.routes.ts`. Consider moving the public landing page route or the protected root layout to ensure no overlap occurs for unauthenticated users.
