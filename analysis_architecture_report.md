# Analysis Architecture Report

This report documents the architecture and state management for the Text and Audio Analysis features in the Emotra platform.

## 1. Text Analysis Feature

**Location:** `src/app/features/analysis/text/text-analysis/`

### File List

- `text-analysis.component.ts`
- `app-text-analysis.html`
- `app-text-analysis.css`

### Architectural Analysis

- **Page States (4):**
  - `input`: The initial state where users enter text.
  - `loading`: Shown during the analysis processing phase (with loading tips).
  - `fetching`: Shown when retrieving an existing report from the API via a shared link or history.
  - `results`: The final state displaying charts, breakdown, and insights.
- **Control Mechanism:** The `state` signal (inherited from `BaseAnalysisComponent`) controls which section is rendered in the HTML via Angular `@if` blocks.
- **API Orchestration:**
  - The call is initiated in `startAnalysis()` which passes an observable from `TextAnalysisService.analyze(text)` to the `executeAnalysisFlow()` method in the base class.
  - Upon success, the response is stored in the `result()` signal.
- **Persistence:**
  - **Local:** The response is immediately saved to `localStorage` via `storageService.saveSession()`.
  - **Cloud:** A background sync is triggered via `orchestrationService.syncSessionToCloud()` which calls the backend `saveTextAnalysis` endpoint.
- **Lifecycle & Navigation:**
  - Navigation away destroys the component; all active subscriptions are cleaned up using `takeUntilDestroyed`.
  - Refreshing the page with a session ID in the URL (`/analysis/text/:id`) triggers `handleRouteParams()` which restores the state.
- **State Restoration:** On initialization, the component checks route parameters. If an ID is present, it first attempts to find the session in `localStorage`. If not found, it enters the `fetching` state to pull the data from the API.

---

## 2. Audio Analysis Feature

**Location:** `src/app/features/analysis/audio/audio-analysis/`

### File List

- `audio-analysis.component.ts`
- `audio-analysis.component.html`
- `audio-analysis.component.css`

### Architectural Analysis

- **Page States (4):**
  - `input`: Initial state with "Upload" and "Record" tabs.
  - `loading`: Shown during the multimodal fusion processing phase.
  - `fetching`: Shown when loading an existing audio report from a URL.
  - `results`: Final state showing fused results, transcription, and multimodal timelines.
- **Control Mechanism:** The `state` signal (inherited from `BaseAnalysisComponent`) manages the view.
- **API Orchestration:**
  - The call is made in `startAnalysis()` using `AudioAnalysisService.analyze(file)`.
  - The multimodal response is stored in the `result()` signal.
- **Persistence:**
  - **Local:** Saved to `localStorage` via `storageService.saveAudioSession()`.
  - **Cloud:** Synchronized via `analysisV2Service.saveAudioAnalysis()`, which handles the multi-part upload of both the analysis result and the source audio file.
- **Lifecycle & Navigation:**
  - `ngOnDestroy()` specifically ensures that any active microphone recording is stopped.
  - Audio playback is halted, and memory for the Blob URLs is managed during transitions.
- **State Restoration:** Uses the same inheritance pattern as Text Analysis. It checks route params on init, looks for a local session match first, and falls back to an API fetch if necessary.

---
