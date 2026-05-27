# Video Analysis Page Implementation Plan

This plan details the implementation of the new **Video Analysis** feature, aligning it with the established patterns of Text, Audio, and Image analysis pages.

## User Review Required

> [!IMPORTANT]
> **No Scale-up Hover Effects:** In accordance with the user's aesthetic requirements, all components on the Video Analysis results page will have absolutely no scale-up hover animations (`hover:scale-*`).
> **Contempt Emotion Class:** The video emotion model maps 8 emotion classes just like the Image model, which includes the `contempt` emotion class. Joy is mapped from `happiness`.

---

## Proposed Changes

### Core services & Infrastructure

#### [MODIFY] [analysis-storage.service.ts](file:///c:/Users/Ahmed%20Mahmoud/Desktop/Graduation%20Project/Project%20Website/src/app/core/services/analysis-storage.service.ts)
- Add `emotra_video_sessions` storage key constant.
- Add `videoSessionsSignal` state signal and public `videoSessions` readonly signal.
- Include `videoSessionsSignal()` in the `allSessions` computed signal to merge all session types.
- Update `loadFromStorage()` to retrieve video sessions.
- Implement helper methods: `saveVideoSession()`, `getVideoSessions()`, `getVideoSessionById()`.
- Add `video` case to `deleteSession()`, `markAsSynced()`, and `clearAll()`.

#### [MODIFY] [analysis-orchestration.service.ts](file:///c:/Users/Ahmed%20Mahmoud/Desktop/Graduation%20Project/Project%20Website/src/app/core/services/analysis-orchestration.service.ts)
- Update the `syncSessionToCloud()` method to accept `'video'` in the `analysisType` union parameter.

#### [MODIFY] [base-analysis.store.ts](file:///c:/Users/Ahmed%20Mahmoud/Desktop/Graduation%20Project/Project%20Website/src/app/core/stores/base-analysis.store.ts)
- Expand the `analysisType` abstract hook parameter to include `'video'` in the union `'text' | 'audio' | 'image' | 'video'`.

---

### Shared Components

#### [MODIFY] [app-icon.component.html](file:///c:/Users/Ahmed%20Mahmoud/Desktop/Graduation%20Project/Project%20Website/src/app/shared/components/app-icon/app-icon.component.html)
- Add a new `@case ('video')` block rendering a camera icon path:
  ```html
  @case ('video') {
    <path d="M23 7l-7 5 7 5V7z M1 7a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V7z" />
  }
  ```

---

### Routing & Hub Layout

#### [MODIFY] [app.routes.ts](file:///c:/Users/Ahmed%20Mahmoud/Desktop/Graduation%20Project/Project%20Website/src/app/app.routes.ts)
- Register lazy-loaded paths for the Video Analysis component:
  - `/analysis/video` mapping to `VideoAnalysisComponent`.
  - `/analysis/video/:id` mapping to `VideoAnalysisComponent`.

#### [MODIFY] [app-analysis.html](file:///c:/Users/Ahmed%20Mahmoud/Desktop/Graduation%20Project/Project%20Website/src/app/features/analysis/app-analysis.html)
- Enable the Video Analysis card:
  - Change `routerLink` to `/analysis/video`.
  - Remove "Coming Soon" badge.
  - Change footer action text from "Explore" to "Get Started".

---

### History Page Integration

#### [MODIFY] [history.component.ts](file:///c:/Users/Ahmed%20Mahmoud/Desktop/Graduation%20Project/Project%20Website/src/app/features/history/history.component.ts)
- Update `FilterType` union type to include `'video'`.
- Add the `Video` tab option to `typeOptions`: `{ label: 'Video', value: 'video' }`.
- Update `visibleSessions` computed mapping:
  - Map the video type icon: `icon: s.type.toLowerCase() === 'video' ? 'video' : ...`
- Invalidate `'emotra_history_meta_video'` and `'emotra_video_sessions'` in `invalidateCacheOnDelete()` and `wipeAllCaches()`.

#### [MODIFY] [app-history.html](file:///c:/Users/Ahmed%20Mahmoud/Desktop/Graduation%20Project/Project%20Website/src/app/features/history/app-history.html)
- Update the dry `#typeBadge` template to map `type === 'video' ? 'video' : ...` icon:
  ```html
  <app-icon [name]="type === 'text' ? 'text' : (type === 'image' ? 'image' : (type === 'video' ? 'video' : 'audio'))" className="w-3.5 h-3.5"></app-icon>
  ```
- Add a new "New Video Analysis" link in the empty state actions template section.

---

### Dashboard Page Integration

#### [MODIFY] [emotion-history-timeline.component.ts](file:///c:/Users/Ahmed%20Mahmoud/Desktop/Graduation%20Project/Project%20Website/src/app/features/dashboard/emotion-history-timeline/emotion-history-timeline.component.ts)
- Expand `TypeFilter` union with `'video'`.
- Insert Video filter option into `TYPE_TABS`: `{ value: 'video', label: 'Video' }`.
- Support `type === 'video'` mapping in `allEntries()` mapping logic.
- Update `getDominantLabel()` and `getDominantConfidence()` to extract emotion statistics from `s.result?.scene_emotion`.

---

### Video Analysis Feature

#### [NEW] [video-analysis.store.ts](file:///c:/Users/Ahmed%20Mahmoud/Desktop/Graduation%20Project/Project%20Website/src/app/core/stores/video-analysis.store.ts)
- Implement `VideoAnalysisStore` extending `BaseAnalysisStore<VideoAnalysisResponse, VideoAnalysisSession>`:
  - Configure Hooks: `analysisType = 'video'`, `analysisRoute = '/analysis/video'`, `expectedApiType = 'Video'`.
  - Signal State: `selectedFile` (`File | null`), `selectedFaceId` (`number | null` where `null` implies Scene Context).
  - Normalization: Map `happiness` to `joy` in frame timelines, scene results, and face emotion lists. Map `contempt` correctly.
  - Computeds:
    - `modelChips`: details for detector, tracking, model version, sampled frames count, processing time.
    - `activeEmotionData`: retrieves dominant label, confidence_percent, category, and full probabilities list for selected face track or overall scene context.
    - `emotionalInsights`: primary emotion sentiment polarity.
  - Implement base methods: `findLocalSession()`, `applySession()`, `saveLocalSession()`, `buildChartData()`, `buildSessionPayload()`, `syncToCloud()`.
  - Orchestration: Connected to background `AnalysisBgService`.

#### [NEW] [video-analysis.component.ts](file:///c:/Users/Ahmed%20Mahmoud/Desktop/Graduation%20Project/Project%20Website/src/app/features/analysis/video/video-analysis/video-analysis.component.ts)
- Component logic exposing the store state, handling file drag-and-drop / selection boundaries, mapping URL preview parameters, and binding play-state streams.
- Fetch historical session media streams using `AnalysisV2Service.getMediaStream(cloudId)` and bypass sanitation security to create standard Object URL video previews.

#### [NEW] [video-analysis.component.html](file:///c:/Users/Ahmed%20Mahmoud/Desktop/Graduation%20Project/Project%20Website/src/app/features/analysis/video/video-analysis/video-analysis.component.html)
- Page layouts with state machine templates:
  - **Input**: Premium drag-drop area supporting video file extensions (`.mp4`, `.webm`, `.ogg`, `.mov`) up to 50MB.
  - **Loading**: Immersive loading state with random video tips.
  - **Results**:
    - `SessionTopBar` navigation actions.
    - `DominantEmotionHero` section showing overall mood or selected face emotion.
    - Spatial Split-view layout:
      - Left: Premium HTML5 `<video>` player showing loaded media with controls.
      - Right: Face Track Selector buttons, Emotion Distribution pie/bar charts, and temporal line chart showing frame-by-frame progression timeline (when a face is selected).
    - Metadata summaries, raw json dropdown section, and integrated `app-analysis-feedback` review panel.

#### [NEW] [video-analysis.component.css](file:///c:/Users/Ahmed%20Mahmoud/Desktop/Graduation%20Project/Project%20Website/src/app/features/analysis/video/video-analysis/video-analysis.component.css)
- Layout CSS styling matching standard design systems. No hover scales.

---

## Verification Plan

### Automated Tests
- Run `npm run build` to verify there are no compilation errors or typing mismatches.
- Perform a client-side execution to check that routing resolves correctly.

### Manual Verification
1. **Upload & Analyze**: Drag or select a video file. Confirm the background runner triggers the processing modal.
2. **Interactive Selection**: After results load, verify that switching from "Scene Context" to individual face tracks updates the timeline and distribution charts correctly.
3. **History logs**: Confirm new video sessions populate in the History list with the video camera icon, and filtering works.
4. **Dashboard**: Confirm total logs counter updates and the video timeline renders data on selecting the Video tab.
