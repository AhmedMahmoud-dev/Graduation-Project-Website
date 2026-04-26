# Prompt: Analysis Cache Layer + Toast Cleanup

## Context

You are working on **Emotra** — an Angular 20 SaaS platform for emotion detection. The project uses:

- Angular 20 — standalone components only, NO NgModules anywhere
- TailwindCSS v4 — primary styling
- RxJS + Angular Signals

### Existing localStorage Keys (do not touch these)

```
emotra_sidebar_expanded
emotra_theme
emotra_token
emotra_user
```

### Relevant Existing Services

Before writing any code, **read these files completely**:

- `src/app/core/services/text-analysis.service.ts`
- `src/app/core/services/audio-analysis.service.ts`
- `src/app/shared/components/toast/toast.component.ts`
- `src/app/features/history/history.component.ts`
- `src/app/features/dashboard/dashboard.component.ts`

Also read any existing service files in `src/app/core/services/` that handle history or stats API calls. Identify them by reading the directory first.

---

## Task 1 — Analysis Cache Layer

### Goal

Implement a professional cache-first (stale-while-revalidate) strategy for analysis data using localStorage. The user should see data instantly on page load from cache, while the app silently revalidates in the background.

### New localStorage Keys to Introduce

| Key                           | Content                                                            | Invalidation                                          |
| ----------------------------- | ------------------------------------------------------------------ | ----------------------------------------------------- |
| `emotra_text_analyses`        | Array of full text analysis result objects, each with `client_id`  | Append on new analysis, never remove individual items |
| `emotra_audio_analyses`       | Array of full audio analysis result objects, each with `client_id` | Append on new analysis, never remove individual items |
| `emotra_history_meta`         | Cached history summary list from `GET /api/analysis/history`       | Invalidate after new analysis save, delete, or clear  |
| `emotra_stats`                | Cached stats object from `GET /api/analysis/stats`                 | Invalidate after new analysis save, delete, or clear  |
| `emotra_analysis_detail_{id}` | Full detail for a single analysis from `GET /api/analysis/{id}`    | Never expires — these records are immutable           |

### Cache Architecture Decision

Examine how many services already exist in `src/app/core/services/`. If there are already many services, integrate the cache logic into the existing relevant services (history service, dashboard/stats service) rather than creating a new file. If a clean separation is clearly better given what you find, create `src/app/core/services/analysis-cache.service.ts`. **You decide based on what you find — do not create unnecessary files.**

### Stale-While-Revalidate Pattern

For history page and dashboard stats:

1. On component init → read from localStorage immediately → render UI (no spinner if cache exists)
2. Simultaneously fire API call in background
3. When API responds → compare with cached value → if different, update localStorage and update UI
4. If cache is empty → show loading state → wait for API → save to cache → render

### New Analysis Save Flow (text and audio)

When a new analysis completes and `POST /api/analysis/text` or `POST /api/analysis/audio` succeeds:

1. Append the full result object (with its `client_id`) to `emotra_text_analyses` or `emotra_audio_analyses`
2. Invalidate `emotra_history_meta` (set to null or delete the key)
3. Invalidate `emotra_stats` (set to null or delete the key)
4. Do NOT show a toast for this — the analysis page already handles its own success state

### History Page — "Open Report" Button

The history list from the API returns both `id` (database integer) and `client_id` (UUID).

When user clicks "Open Report":

1. Use `client_id` to look up the full result in `emotra_text_analyses` or `emotra_audio_analyses` array (match by `client_id` field)
2. If found in localStorage → open immediately, no API call
3. If NOT found (user cleared storage) → call `GET /api/analysis/{id}` using the database `id` → save the result into the correct local array (`emotra_text_analyses` or `emotra_audio_analyses`) → then open

### Delete / Clear Operations

- After `DELETE /api/analysis/{id}` succeeds → remove that entry from `emotra_history_meta` cache, invalidate `emotra_stats`
- After `DELETE /api/analysis/clear` succeeds → clear `emotra_history_meta`, `emotra_stats`, `emotra_text_analyses`, `emotra_audio_analyses`, and all `emotra_analysis_detail_*` keys

### History Pagination Cache

Cache `emotra_history_meta` as the full paginated response for the current page and filter. Structure the cache key to include page and type if the history page supports filtering and pagination (read the existing component to confirm). If it does: use keys like `emotra_history_meta_p1_all`, `emotra_history_meta_p1_text`, etc. Invalidate ALL `emotra_history_meta_*` keys on any mutation.

---

## Task 2 — Toast Notification Cleanup

### Problem

Toasts are currently firing on every API call including page loads, background fetches, and cache hits. This is excessive and unprofessional.

### Read First

Read `src/app/shared/components/toast/toast.component.ts` and its service completely. Then find every place in the codebase that calls the toast service and audit each one.

### New Toast Rules — Strict

**Show toast ONLY for:**

- ✅ New analysis saved to backend successfully (text or audio POST success)
- ✅ Single analysis deleted successfully
- ✅ All history cleared successfully
- ✅ Any user-triggered action that fails with an error (delete failed, save failed, network error on a mutation)

**NEVER show toast for:**

- ❌ Page load data fetch (history list, stats, any GET on page init)
- ❌ Background revalidation completing
- ❌ Cache hit
- ❌ Silent background API calls
- ❌ Any GET request success of any kind

### Implementation

Go through every toast call site. Remove all toasts that violate the rules above. Keep only the ones that match the allowed list. Do not change toast component internals — only remove/adjust call sites.

---

## Strict Rules

- NO NgModules anywhere
- NO SCSS — plain CSS or TailwindCSS only
- NO UI libraries
- All colors through CSS variables — never hardcode hex values
- DRY is the highest priority — never duplicate logic
- All API URLs through `environment.ts` only
- Signal inputs (`input.required<>()`) for reactive child components
- Every component stays in its own folder — do not move or restructure existing files
- `main.py` is NEVER touched
- API response field names are NEVER changed
- Read ALL relevant existing files completely before writing a single line of code
- Do not change anything you were not asked to change

---

## Plan First

Before writing any code:

1. List every file you will create (if any)
2. List every file you will modify
3. Describe exactly what changes in each file
4. Describe the cache key structure you will use
5. List every toast call site you found and whether you are keeping or removing it

**Wait for approval before implementing.**

---

## FINAL DRY AUDIT

Before finishing, go through every file you created or modified and check:

1. Same Tailwind class combinations (4+ classes) repeated → extract to CSS class
2. Same HTML structure repeated → extract to sub-component or `ng-template`
3. Same logic written more than once → extract to private method
4. Same CSS values repeated → extract to CSS variable
5. Patterns shared across components → suggest moving to `shared/`

Report every violation found and what you did to fix it.
If nothing found: "DRY audit complete — no violations found."
