# Implementation Plan - Image & Video Support in Compare Hub

This plan outlines the design and architectural changes required to introduce **Image** and **Video** tabs and comparison logic inside the Compare Hub, matching the existing premium, side-by-side **Text** and **Audio** comparisons. This plan is based on a deep analysis of the current signal-driven architecture and component-based structure.

---

## 1. Core Architecture Extensions

We will extend the existing orchestrator and storage layers to support the new analysis types while maintaining the current signal-based reactivity.

### [MODIFY] `compare.component.ts`

- **Extend Types**: Update `compareType` signal and `ComparePersistedState` interface to support `'text' | 'audio' | 'image' | 'video'`.
- **Extend Session Signals**: Update `analysisA` and `analysisB` to include `ImageAnalysisSession` and `VideoAnalysisSession`.
- **Rehydration Logic**: Update `onTypeChange()` and `rehydrateFromSession()` to handle the new types.
- **Session Resolution**:
  - Enhance `resolveSession()` to utilize `storageService.getImageSessionById()` and `storageService.getVideoSessionById()`.
  - Update `buildSessionFromApi()` to correctly map the unified `AnalysisDetails` payload into `ImageAnalysisSession` or `VideoAnalysisSession` based on the type.
- **Service Integration**: Ensure `AnalysisV2Service.getAnalysisDetails()` is called with the correct client ID and type-specific construction logic is applied.

### [MODIFY] `compare-selector.component.ts`

- **Navigation Options**: Add `Image` and `Video` to the `navOptions` array.
- **History Fetching**:
  - Update `loadHistoryFromCache()` to handle `emotra_history_meta_image` and `emotra_history_meta_video` keys.
  - Update `fetchTypeHistory()` to pass `"Image"` or `"Video"` as the `AnalysisType` to the backend service.

---

## 2. Side-by-Side Visualization Updates

Each sub-component will be updated to handle the new data structures using the established pattern of type-based `computed` signals.

### [MODIFY] `compare-hero.component.ts`

- **Emotion Resolution**: Update `getDominantEmotion()` to extract `scene_emotion` for both Image and Video types.
- **Dynamic Meta Badges**:
  - **Image**: Display `faces_detected` count and `frame_quality` resolution.
  - **Video**: Display `duration_seconds` (formatted) and `faces_tracked` count.
- **Aesthetic Alignment**: Maintain the current color logic based on the dominant emotion category (`positive`, `negative`, `neutral`).

### [MODIFY] `compare-timeline.component.ts`

- **Video Implementation**:
  - Map `scene_emotion` timeline (if available) or aggregate from face timelines.
  - Align frames by `timestamp_sec`.
- **Image Implementation**:
  - Since images lack a temporal dimension, render a side-by-side **Comparative Probability Bar Chart** showing the confidence levels of all scene emotions (distribution of the single frame).
- **Mapping Logic**: Update `getTimelineRaw()` and `mapToTimelineData()` to branch for `'image'` and `'video'`.

### [MODIFY] `compare-distribution.component.ts`

- **Probabilities Extraction**: Update `getProbabilities()`:
  - **Image/Video**: Extract from `scene_emotion` probabilities or `combined_results`.
- **Comparative Diff**: Ensure the `diffs` computed signal correctly calculates deltas between Slot A and Slot B for the new media types.

### [MODIFY] `compare-diff.component.ts`

- **List Resolution**: Update `getList()`:
  - **Image**: Return the `faces` array to allow side-by-side face comparison.
  - **Video**: Return `faces` (for track comparison) or `transitions` timeline.
- **Item Rendering**:
  - Update `getText()` to show face IDs for images/videos (e.g., `"Face #1 Detected"`) or transition timestamps for video.
  - Update `getDominant()` to extract emotions from face tracking results.
- **Visuals**: Maintain the "Match/No Match" indicator based on the dominant emotion of compared faces or segments.

### [MODIFY] `compare-stats.component.ts`

- **Metadata Matrix**: Extend `statsRows` with conditional entries:
  - **Common**: Date, Dominant Emotion, Confidence, Processing Time, Model Info.
  - **Image Specific**: Resolution (Width x Height), Was Downscaled (Yes/No), Total Faces.
  - **Video Specific**: Total Duration, Total Frames, Sampled Frames, Tracks Count.
- **Helper Methods**: Update `getInputLength()`, `getSegments()`, `getTokens()`, and `getModel()` to handle the nested structures of image and video results.

---

## 3. Storage & Service Layer

- Ensure `AnalysisStorageService` is properly utilized for saving/retrieving image and video sessions.
- Verify that `AnalysisV2Service.getHistory()` supports the new type filters.

---

## 4. Verification & Quality Assurance

### Automated Testing

- Execute `ng build` to verify type safety across all updated components.
- Validate that the existing text/audio comparison logic remains unaffected (Regression Testing).

### Manual UI/UX Validation

- **Image Tab**: Select two images, verify face diff grid, hero metadata, and scene distribution.
- **Video Tab**: Select two videos, verify timeline synchronization, track stats, and processing benchmarks.
- **Rehydration**: Ensure that refreshing the page while viewing a video comparison restores the exact same sessions in both slots.
