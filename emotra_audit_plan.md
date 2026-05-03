# Emotra Frontend Codebase Audit

**Date:** 2026-05-03
**Scope:** Angular 19 frontend — services, components, models, guards, interceptors
**Auditor:** Automated professional review

---

## Problem 1 — Duplicate `AlertStats` Interface Across Two Model Files

- **File(s):**
  - `src/app/core/models/alert.model.ts` (lines 15–20)
  - `src/app/core/models/alert.models.ts` (lines 1–6)

- **What is wrong:** The `AlertStats` interface is defined identically in two separate files: `alert.model.ts` and `alert.models.ts`. Both files export the same four-field interface (`total_alerts`, `unread_alerts`, `critical_alerts`, `high_alerts`). The `alerts.service.ts` imports `AlertStats` from `alert.models.ts`, while `alert.model.ts` also exports it alongside `AlertItem` and `AlertsPagedResult`. This creates ambiguity about which is the canonical source of truth. Any future change to one will silently diverge from the other.

  The same pattern exists for `ThemeColorsDto`, which is defined in both `src/app/core/services/settings-api.service.ts` (lines 7–15) and `src/app/core/services/color-settings.service.ts` (lines 37–45).

- **Impact:** A developer modifying `AlertStats` in one file will not realize the other exists, leading to silent type divergence. Import auto-complete will suggest both, causing confusion. The `ThemeColorsDto` duplication carries the same risk for theme-related features.

- **Professional fix:** Consolidate `AlertStats` into a single file — `alert.model.ts` is the natural home since it already contains the related `AlertItem` and `AlertsPagedResult` types. Delete `alert.models.ts` entirely and update all imports. For `ThemeColorsDto`, move it to a shared model file (e.g., `appearance.model.ts`) and import from there in both services.

---

## Problem 2 — Fire-and-Forget Prefetch Subscriptions With No Error Handling in AuthService

- **File(s):**
  - `src/app/core/services/auth.service.ts` (lines 380–453)

- **What is wrong:** The `prefetchHistoryMeta()` and `prefetchAdminData()` methods fire 8 independent HTTP subscriptions on login with empty `error: () => {}` handlers or no error handler at all. For example:

  ```
  this.adminService.getStats().subscribe(r => {
    if (r.is_success && r.data) localStorage.setItem(...);
  });
  ```

  These subscriptions are never cleaned up — they are created inside the `login()` tap operator and have no `takeUntil`, `DestroyRef`, or any lifecycle tie. If the user navigates away or logs out before all 8 requests complete, the callbacks still execute, writing stale data to localStorage for a now-logged-out session.

- **Impact:** Race condition where prefetch responses arrive after logout, re-populating localStorage with data from the previous session. This can cause stale data to appear on the next login or, worse, leak admin data into a non-admin session if the admin logs out and a regular user logs in on the same browser.

- **Professional fix:** Track all prefetch subscriptions and cancel them on logout. Use a `Subject` that emits in `clearAllAuth()`, and pipe all prefetch observables through `takeUntil(this.destroy$)`. Add a guard check at the start of each `next` callback to verify the user is still authenticated before writing to localStorage.

---

## Problem 3 — Pervasive `any` Types in Service Layer Defeating TypeScript Safety

- **File(s):**
  - `src/app/core/services/support.service.ts` (lines 16, 23) — `Observable<any>` return types
  - `src/app/core/services/admin-support.service.ts` (lines 16, 31) — `Observable<any>` return types
  - `src/app/core/services/alerts.service.ts` (lines 33, 35, 92, 144, 158, 171, 174, 271) — `Subject<any>`, `http.get<any>`, `alert: any` parameter
  - `src/app/core/services/feedback.service.ts` (lines 29, 40, 64, 73) — `any` in all cache methods
  - `src/app/shared/base/base-analysis.component.ts` (lines 64, 67, 70, 73, 76) — all abstract methods use `any`

- **What is wrong:** Critical service methods return `Observable<any>` instead of typed responses. The `SupportService.submitMessage()` and `getMyMessages()` both return `Observable<any>`. The `AlertsService` uses `Subject<any>` for its alert stream and `http.get<any>` for stats/settings fetches. The `FeedbackService` cache methods accept and return `any`. The `BaseAnalysisComponent` declares all its abstract methods with `any` parameters and return types, meaning every concrete implementation inherits untyped contracts.

- **Impact:** TypeScript cannot catch type mismatches at compile time. A component consuming `getMyMessages()` gets no autocomplete, no null safety, and no refactoring support. Bugs from accessing non-existent properties or passing wrong shapes will only surface at runtime. The `BaseAnalysisComponent` `any` types propagate through every analysis page in the app.

- **Professional fix:** Define proper response interfaces for every API endpoint. Replace `Observable<any>` with `Observable<ApiResponse<T>>` using the existing `ApiResponse<T>` generic wrapper. Type the `alertSubject` as `Subject<AlertItem>`. Replace `any` in `BaseAnalysisComponent` abstract methods with the generic `TResult` parameter that already exists on the class, or introduce a `TSession` generic for session-related methods.

---

## Problem 4 — Memory Leaks From Unmanaged Subscriptions in Multiple Components

- **File(s):**
  - `src/app/features/compare/compare/compare.component.ts` (line 157) — `.subscribe()` in `resolveSession()`
  - `src/app/features/admin/admin-dashboard/admin-dashboard.component.ts` (line 219) — `.subscribe()` in `fetchStats()`
  - `src/app/features/admin/admin-users/admin-users.component.ts` (lines 180, 234, 310, 370) — `.subscribe()` in `confirmBan()`, `fetchUsers()`, `toggleUserStatus()`, `executeNuclearDelete()`
  - `src/app/features/admin/admin-support/admin-support.component.ts` (lines 69, 111) — `.subscribe()` in `fetchMessages()`, `submitReply()`
  - `src/app/shared/base/base-analysis.component.ts` (line 115) — `this.route.params.subscribe()` with no cleanup

- **What is wrong:** These components call `.subscribe()` on HTTP observables without any unsubscription mechanism. While HTTP observables typically complete after one emission, the `route.params` subscription in `BaseAnalysisComponent` is a long-lived observable that never completes. The admin components inject `DestroyRef` (e.g., `admin-users.component.ts` line 40) but never use it with `takeUntilDestroyed()` on their HTTP calls. The `CompareComponent` does not inject `DestroyRef` at all.

  Critically, `BaseAnalysisComponent.subscribeToRouteParams()` at line 115 subscribes to `this.route.params` — a hot observable — with no cleanup. Every analysis page inherits this leak.

- **Impact:** The `route.params` subscription in `BaseAnalysisComponent` will keep firing callbacks after the component is destroyed if the route changes, potentially calling `loadSessionById()` on a destroyed component. In the admin components, rapid navigation between pages while HTTP requests are in-flight will cause callbacks to execute on destroyed components, leading to signal updates on dead instances.

- **Professional fix:** Add `takeUntilDestroyed()` to the `route.params` subscription in `BaseAnalysisComponent` by injecting `DestroyRef`. For the admin components that already inject `DestroyRef`, pipe all `.subscribe()` calls through `takeUntilDestroyed(this.destroyRef)`. For `CompareComponent`, inject `DestroyRef` and apply the same pattern to `resolveSession()`.

---

## Problem 5 — Silent Error Swallowing in AlertsService Polling and SignalR

- **File(s):**
  - `src/app/core/services/alerts.service.ts` (lines 48, 151, 166, 274)

- **What is wrong:** The `AlertsService` systematically swallows every error with empty handlers:
  - `initializeFromLocalStorage()` line 48: `catch (e) { }` — corrupted localStorage JSON is silently ignored
  - `fetchStats()` line 151: `error: () => { }` — API failures produce no feedback
  - `fetchSettings()` line 166: `error: () => { }` — same pattern
  - `updateLocalStorageStats()` line 274: `catch (e) { }` — localStorage quota exceeded is invisible

  The backup polling at line 282 runs `fetchStats()` every 60 seconds. If the API is down, this silently fails 60 times per hour with zero indication to the user or developer. The `pollingIntervalId` is typed as `any` (line 32) instead of `ReturnType<typeof setInterval>`.

- **Impact:** When the alerts API goes down, the user sees stale data with no indication that real-time updates have stopped. Developers debugging alert issues have no logs to trace. If localStorage fills up, stats silently stop persisting, causing the UI to reset to zeros on every page load.

- **Professional fix:** Add meaningful error handling: log errors in development, show a subtle "alerts unavailable" indicator in the UI after N consecutive failures, and implement exponential backoff on the polling interval instead of a fixed 60-second retry. Type `pollingIntervalId` properly. Add at minimum a `console.warn` in the localStorage catch blocks so quota issues are discoverable.

---

## Problem 6 — `getComputedStyle` Called Inside Angular `computed()` Signals

- **File(s):**
  - `src/app/features/admin/admin-dashboard/admin-dashboard.component.ts` (lines 92–93, 115–116, 155–156)

- **What is wrong:** The `analysesByTypeData`, `trendChartOptions`, and `typeTrendOptions` computed signals call `getComputedStyle(document.documentElement)` to read CSS custom properties:

  ```
  const purple = getComputedStyle(document.documentElement)
    .getPropertyValue('--color-brain').trim() || '#a855f7';
  ```

  Angular's `computed()` tracks signal dependencies to know when to re-evaluate. DOM reads via `getComputedStyle` are not signals — Angular has no way to know when CSS variables change. This means the computed values will NOT update when the user switches themes, because the signal dependency graph doesn't include DOM state.

- **Impact:** After a theme change, the chart colors remain stale until something else triggers re-computation (e.g., new data fetch). The charts display colors from the previous theme, creating a visual inconsistency. This affects all three chart computed signals in the admin dashboard and likely the same pattern in the 6 other files that use `getComputedStyle`.

- **Professional fix:** Inject the `ColorSettingsService` (which already exposes theme colors as signals) and read colors from its signals instead of the DOM. This makes the computed signals reactive to theme changes. For example, replace `getComputedStyle(...).getPropertyValue('--color-primary')` with `this.colorSettings.lightColors()['--color-primary']` (or the appropriate dark/light variant based on current theme).

---

## Problem 7 — AuthService Stores JWT Token in localStorage

- **File(s):**
  - `src/app/core/services/auth.service.ts` (lines 364–373)

- **What is wrong:** The `saveAuth()` method stores the JWT token directly in localStorage:

  ```
  localStorage.setItem(tokenKey, user.token);
  localStorage.setItem(userKey, JSON.stringify(user));
  ```

  The full user object (which includes the token) is also serialized to localStorage. This means the JWT exists in two localStorage entries. localStorage is accessible to any JavaScript running on the same origin, making it vulnerable to XSS attacks. If any part of the application has an XSS vulnerability (or a compromised third-party script), an attacker can trivially read `localStorage.getItem('emotra_token')` and exfiltrate the session.

- **Impact:** A single XSS vulnerability anywhere in the app (including from third-party dependencies like ECharts, Three.js, or anime.js) gives an attacker full access to the user's JWT token. This is especially critical because admin tokens are stored the same way, meaning an XSS on any page could compromise admin credentials.

- **Professional fix:** Move token storage to an `HttpOnly` cookie set by the backend. The token should never be accessible to JavaScript. If cookies are not feasible due to CORS constraints, at minimum: (1) stop storing the token redundantly in both a dedicated key and inside the user object, (2) implement a short-lived access token with a refresh token rotation scheme, and (3) add Content Security Policy headers to reduce XSS surface area.

---

## Problem 8 — Admin Dashboard Component Has Business Logic and DOM Access in Computed Signals

- **File(s):**
  - `src/app/features/admin/admin-dashboard/admin-dashboard.component.ts` (lines 107–177)

- **What is wrong:** The `AdminDashboardComponent` contains ~70 lines of ECharts configuration logic directly in computed signals (`trendChartOptions` and `typeTrendOptions`). This includes data transformation (date formatting, Map construction, array mapping), color resolution, and full chart option assembly. The component is doing the work of a service.

  The `formatDate()` helper (line 179), `getInitials()` helper (line 184), date-to-count Map construction, and chart series configuration are all business/presentation logic that belongs in a dedicated chart-builder service or utility, not in a component class.

- **Impact:** The component is 242 lines and growing. The chart logic cannot be reused — if another page needs a similar trend chart, it must duplicate this code. Testing the chart configuration requires instantiating the full component with all its dependencies. The mixing of concerns makes the component harder to maintain and reason about.

- **Professional fix:** Extract chart configuration into a dedicated `AdminChartService` or utility function that takes `PlatformStats` and theme colors as inputs and returns `EChartsOption` objects. Move `formatDate()` and `getInitials()` to the existing `FormattingService`. The component should only wire signals together: `stats` in, chart options out, with the transformation happening in the service layer.

---

## Problem 9 — No OnPush Change Detection on Any Component

- **File(s):**
  - `src/app/features/dashboard/dashboard.component.ts`
  - `src/app/features/history/history.component.ts`
  - `src/app/features/compare/compare/compare.component.ts`
  - `src/app/features/alerts/alerts.component.ts`
  - `src/app/features/admin/admin-dashboard/admin-dashboard.component.ts`
  - `src/app/features/admin/admin-users/admin-users.component.ts`
  - `src/app/features/admin/admin-support/admin-support.component.ts`
  - `src/app/features/settings/settings.component.ts`
  - (and all other feature components)

- **What is wrong:** Not a single component in the entire codebase uses `changeDetection: ChangeDetectionStrategy.OnPush`. Every component uses the default change detection strategy, which means Angular runs change detection on every component in the tree on every browser event (click, mousemove, keypress, timer tick, HTTP response). The codebase already uses signals extensively, which are designed to work optimally with OnPush — the infrastructure is there, but the optimization is not enabled.

- **Impact:** Every 60-second polling tick from `AlertsService`, every SignalR message, every mouse movement triggers a full change detection cycle across the entire component tree. On the admin dashboard with multiple ECharts instances and computed signals, this causes unnecessary re-evaluation of template bindings and potential frame drops. The performance cost scales with the number of components rendered simultaneously.

- **Professional fix:** Add `changeDetection: ChangeDetectionStrategy.OnPush` to every component decorator. Since the codebase already uses signals for state management (not mutable properties), OnPush will work correctly out of the box — signals automatically notify Angular's change detection when they update. Start with the heaviest components (admin-dashboard, history, alerts) and roll out to the rest. This is a low-risk, high-reward change.

---

## Problem 10 — `BaseAnalysisComponent` Route Params Subscription Bypasses Service Layer for API Fallback

- **File(s):**
  - `src/app/shared/base/base-analysis.component.ts` (lines 114–153, 162–210)

- **What is wrong:** The `BaseAnalysisComponent` has two separate code paths that both make API calls and manage localStorage, creating a split responsibility:
  1. `fetchFromApi()` (line 135) calls `analysisV2Service.getAnalysisDetails()`, then calls `this.saveLocalSession()` and `this.applySession()` — the component directly orchestrates the fetch-save-apply pipeline.
  2. `executeAnalysisFlow()` (line 162) subscribes to an analysis observable, generates a session ID with `crypto.randomUUID()`, saves to localStorage, builds chart data, navigates, and then conditionally syncs to cloud — all inside a `setTimeout(() => {...}, 500)` with no explanation for the 500ms delay.

  The cloud sync at line 185 has a destructive error path: if the sync fails, it _deletes_ the local session (`this.storageService.deleteSession(sid, this.analysisType)`), meaning the user loses their analysis results if the network request fails after the analysis completes successfully.

- **Impact:** When cloud sync fails (network blip, server timeout), the user's completed analysis is deleted from localStorage and they see it vanish. The analysis was already computed and displayed — deleting it on sync failure is a data loss bug. The 500ms `setTimeout` delays result rendering for no documented reason and is not cancellable if the component is destroyed during the delay. The split between component-level orchestration and service-level storage makes the data flow hard to trace and test.

- **Professional fix:** Remove the destructive `deleteSession()` calls from the sync error path — a failed cloud sync should mark the session as "unsynced" (the `isSynced: false` flag already exists in the model), not delete it. Move the orchestration logic (fetch → save → apply → sync) into the `AnalysisV2Service` or a dedicated `AnalysisOrchestrationService`. Remove or document the 500ms `setTimeout` — if it exists to allow a loading animation to complete, use an Angular animation callback instead.
