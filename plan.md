# Refactoring BaseAnalysisComponent to Composable Service-Based Stores

Refactor the heavy base class `BaseAnalysisComponent` inheritance pattern into decoupled, composable service-based stores (`TextAnalysisStore` and `AudioAnalysisStore`). This removes the "Heavy Base Class" code smell, separates UI concerns from business logic, and ensures that the core state machines and orchestration logic can be reused anywhere (e.g., modals, background workers) without inheritance.

## User Review Required

> [!IMPORTANT]
> The components `TextAnalysisComponent` and `AudioAnalysisComponent` will no longer extend `BaseAnalysisComponent`. Instead, they will declare a local provider for their respective store and delegate core signals and methods to it.
>
> The HTML templates bound to these components do NOT need to change because the components will expose identical signals and delegates, maintaining high UI backward compatibility and zero template risk.

## Proposed Changes

### Core & Stores Component

Create the base analysis store class and concrete store implementations.

#### [NEW] [base-analysis.store.ts](file:///c:/Users/Ahmed%20Mahmoud/Desktop/Graduation%20Project/Project%20Website/src/app/core/stores/base-analysis.store.ts)

- Abstract class containing common signals (`state`, `error`, `result`, `sessionId`, `timelineData`, `distributionData`).
- Handles common lifecycle routines: route param subscription, session fetching from API fallback, storage sync, and analysis execution flow.
- Exposes `{ optional: true }` injection for router-related services to ensure compatibility with non-routing environments like modals or background workers.

#### [NEW] [text-analysis.store.ts](file:///c:/Users/Ahmed%20Mahmoud/Desktop/Graduation%20Project/Project%20Website/src/app/core/stores/text-analysis.store.ts)

- Concrete injectable store for text emotion analysis.
- Implements `BaseAnalysisStore` hooks (storage retrieval, storage saving, payload building, cloud sync, and chart data formatting).

#### [NEW] [audio-analysis.store.ts](file:///c:/Users/Ahmed%20Mahmoud/Desktop/Graduation%20Project/Project%20Website/src/app/core/stores/audio-analysis.store.ts)

- Concrete injectable store for audio emotion analysis.
- Implements `BaseAnalysisStore` hooks (storage retrieval, storage saving, payload building, cloud sync, and chart data formatting).
- Integrates with `AnalysisBgService` to handle background job completion, error state transitions, and automatic routing updates.

---

### Features & Shared Component

Refactor existing components to utilize the new stores and remove inheritance.

#### [MODIFY] [text-analysis.component.ts](file:///c:/Users/Ahmed%20Mahmoud/Desktop/Graduation%20Project/Project%20Website/src/app/features/analysis/text/text-analysis/text-analysis.component.ts)

- Remove `extends BaseAnalysisComponent`.
- Inject `TextAnalysisStore` and declare it in the component's `providers` array.
- Expose delegated signals/properties (`state`, `result`, `error`, `timelineData`, `distributionData`, `sessionId`) pointing directly to the store so the template remains unchanged.
- Remove inherited abstract method overrides and place the logic inside the store.
- Retain text-specific UI actions (samples, text change helpers, calculations).

#### [MODIFY] [audio-analysis.component.ts](file:///c:/Users/Ahmed%20Mahmoud/Desktop/Graduation%20Project/Project%20Website/src/app/features/analysis/audio/audio-analysis/audio-analysis.component.ts)

- Remove `extends BaseAnalysisComponent`.
- Inject `AudioAnalysisStore` and declare it in the component's `providers` array.
- Expose delegated signals/properties (`state`, `result`, `error`, `timelineData`, `distributionData`, `textDistributionData`, `sessionId`) pointing directly to the store so the template remains unchanged.
- Remove inherited abstract method overrides and place the logic inside the store.
- Retain audio-specific UI and player/recording functionality.

#### [DELETE] [base-analysis.component.ts](file:///c:/Users/Ahmed%20Mahmoud/Desktop/Graduation%20Project/Project%20Website/src/app/shared/base/base-analysis.component.ts)

- Remove the legacy `BaseAnalysisComponent` to keep the codebase clean.

---

## Verification Plan

### Automated Tests

- Run Angular compiler/build checks to verify that the refactored code compiles without errors:
  `npm run build` or `npx ng build`

### Manual Verification

- Verify navigation to Text Analysis:
  - Input sample text and run analysis.
  - Check that chart data rendering, timeline, distribution, and details load correctly.
  - Verify that the URL updates with the session ID.
  - Verify page-reload loads the local session.
- Verify navigation to Audio Analysis:
  - Upload audio file and run analysis.
  - Verify background task execution and rendering of audio timeline, transcribed text, and distribution metrics.
