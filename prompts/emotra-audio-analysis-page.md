# Emotra — Audio Analysis Page
## Prompt for AI Agent (Claude Opus 4.6 Thinking)

---

## Your Role

You are a senior Angular frontend developer continuing work on **Emotra** — a production-level AI SaaS platform. Read every existing file before touching it. Reuse everything that already exists.

---

## Tech Rules (non-negotiable)

- Angular latest, standalone components, NO NgModules
- TailwindCSS as primary styling, plain CSS allowed, NO SCSS
- No UI component libraries — build from scratch
- All API URLs from `environment.ts` only
- All HTTP calls through `core/services/` only — never from components
- All models as TypeScript interfaces in `core/models/`
- Angular Signals for UI state, RxJS for async
- ECharts via `ngx-echarts` for all charts

---

## Files To Read First

Before writing any code, read these files:
- `src/environments/environment.ts`
- `src/app/core/services/analysis-storage.service.ts`
- `src/app/core/models/text-analysis.model.ts`
- `src/app/features/analysis/text/text-analysis.component.ts` ← follow same style exactly
- `src/app/layouts/app-layout/app-layout.component.ts`
- `src/app/core/services/chart-theme.service.ts`
- `src/styles.css`

**IMPORTANT:** The audio page must look and feel identical in style to the text analysis page. Same card styles, same spacing, same layout patterns, same theme behavior. Do not invent a new design language.

---

## Route

```
/analysis/audio      → AppLayout → AudioAnalysisComponent  [AuthGuard]
/analysis/audio/:id  → AppLayout → AudioAnalysisComponent  [AuthGuard]
```

Add both routes to `app.routes.ts`. On init: if `:id` param exists → load from storage → show results state directly.

---

## Design System

### CSS Variables (never hardcode colors)
```
--color-bg, --color-surface, --color-border
--color-text, --color-text-muted
--color-primary (#6c63ff), --color-accent (#00d4aa)
```

### Emotion Color Map
```typescript
const EMOTION_COLORS: Record<string, string> = {
  anger:    '#ff4757',
  disgust:  '#a29bfe',
  fear:     '#fd9644',
  joy:      '#ffd32a',
  neutral:  '#778ca3',
  sadness:  '#4a90d9',
  surprise: '#00d4aa',
};
```

---

## Real API Response Structure

**Endpoint:** `POST environment.apiUrl + '/emotion/audio_model'`
**Body:** `FormData` with audio file field

**Full TypeScript interfaces — model exactly:**

```typescript
// core/models/audio-analysis.model.ts

export interface AudioSegment {
  segment_index: number;
  timestamp_offset: number;             // seconds: 0.0, 1.0, 2.0...
  probabilities: Record<string, number>;
  dominant: {
    label: string;
    confidence: number;
    category: string;
  };
  intensity_weight: number;
  frame_reference: string;              // e.g. "audio_seg_0"
}

export interface AudioEmotionTrack {
  timeline: AudioSegment[];
  combined_probs: number[];             // 7 floats: anger, disgust, fear, joy, neutral, sadness, surprise
  segments_count: number;
  duration_seconds: number;
}

export interface TextEmotionTrack {
  text: string;
  sentences_count: number;
  sentences_analysis: {
    sentence: string;
    probabilities: Record<string, number>;
    dominant: { label: string; confidence: number; category: string; };
    intensity_weight: number;
  }[];
  full_text_analysis: {
    probabilities: Record<string, number>;
    dominant: { label: string; confidence: number; category: string; };
  };
  combined_final_emotion: {
    label: string; confidence: number; confidence_percent: number; category: string;
  };
  combined_results: { label: string; confidence: number; confidence_percent: number; }[];
  input_info: { input_length: number; token_count: number; input_was_truncated: boolean; };
  timestamp: string;
  processing_time_ms: number;
  model_info: { name: string; version: string; device_used: string; };
}

export interface AudioAnalysisResponse {
  audio_filename: string;
  transcribed_text: string;
  audio_emotion: AudioEmotionTrack;
  text_emotion: TextEmotionTrack;
  final_multimodal_emotion: {
    label: string; confidence: number; confidence_percent: number; category: string;
  };
  final_multimodal_results: { label: string; confidence: number; confidence_percent: number; }[];
  timestamp: string;
  processing_time_ms: number;
  model_info: {
    audio_model: string;       // e.g. "superb/hubert-large-superb-er"
    text_model_api: string;
    whisper_model: string;     // e.g. "small"
    fusion_version: string;    // e.g. "v1.0"
  };
}
```

---

## Session ID & Storage

Add to `core/models/text-analysis.model.ts`:

```typescript
export interface AudioAnalysisSession {
  id: string;
  type: 'audio';
  timestamp: string;
  inputFileName: string;
  durationSeconds: number;
  result: AudioAnalysisResponse;
}
```

Update `AnalysisStorageService`:
- Add `saveAudioSession(session: AudioAnalysisSession): void`
- Add `getAudioSessionById(id: string): AudioAnalysisSession | null`
- Add `getAudioSessions(): AudioAnalysisSession[]`
- Use separate key: `emotra_audio_sessions`
- Keep storage logic 100% inside the service — easy to swap to API later

After successful API response:
1. `crypto.randomUUID()` → session ID
2. Build `AudioAnalysisSession`
3. `analysisStorageService.saveAudioSession(session)`
4. Navigate to `/analysis/audio/:id`

---

## Page States

```typescript
type PageState = 'input' | 'loading' | 'results';
state = signal<PageState>('input');
```

---

## State 1 — Input

Two tabs: **Upload Audio** (default) | **Record Audio**

### Tab 1 — Upload Audio
- Drag & drop zone, same card style as text page textarea
- Click to browse fallback
- Accepted: `.mp3`, `.wav`, `.ogg`, `.m4a`, `.webm`
- Max 25MB — inline error if exceeded
- After file selected: show file name, size, duration
- Static waveform preview drawn from file using `AudioContext.decodeAudioData()`
- "Analyze" button — disabled until file selected

### Tab 2 — Record Audio
- Centered mic icon area
- "Start Recording" button — brand primary
- Request `getUserMedia` on click — show clear error if denied
- **While recording:**
  - Live waveform visualizer (spec below)
  - Timer: `00:00` counting up
  - "Stop Recording" button (red)
- **After stop:**
  - `<audio>` element for playback
  - Duration + size info
  - Static waveform of recorded audio
  - "Re-record" (ghost) + "Analyze" (primary)

---

## Waveform Visualizer Component

`src/app/shared/components/audio-waveform/audio-waveform.component.ts`

Standalone, reusable. Live visualization ONLY.

```typescript
@Input() isRecording = false;
@Output() streamReady = new EventEmitter<MediaStream>();
```

- `getUserMedia` → `AudioContext` → `AnalyserNode` (`smoothingTimeConstant: 0.8`)
- `getByteFrequencyData()` in `requestAnimationFrame` loop
- ~50 symmetric vertical bars mirrored around center on `<canvas>`
- Heights react to amplitude — minimum 2px when silent
- Cancel animation frame on stop — no memory leaks
- Bar color: `--color-primary` with canvas `shadowBlur` glow
- Dark mode: stronger glow / Light mode: slightly lower opacity
- Canvas: 80px height, 100% container width, transparent background

---

## State 2 — Loading

Same style as text analysis:
- Pulsing sound wave SVG with CSS animation
- Cycling messages every 1.5s:
  1. "Preparing your audio..."
  2. "Transcribing speech..."
  3. "Analyzing audio emotion segments..."
  4. "Running text emotion analysis..."
  5. "Calculating intensity weights..."
  6. "Fusing audio and text signals..."
  7. "Building your emotion timeline..."
- Thin animated progress bar using `--color-primary`

---

## State 3 — Results

**Match text analysis results layout exactly — same cards, same spacing, same feel.**

### 3.1 — Top Bar
- Session ID badge: `Session #xxxxxxxx` (first 8 chars) + Copy button
- "New Analysis" button → reset to input state

### 3.2 — Final Multimodal Emotion Card (hero)
From `final_multimodal_emotion`:
- Big emotion label, `confidence_percent`%, category badge
- Emotion color tint — left border in light mode, subtle glow in dark mode

### 3.3 — Transcribed Text Card
From `transcribed_text`:
- Label: "Transcribed Speech"
- The transcribed text in a readable block
- Badge: `Whisper ${model_info.whisper_model}`

### 3.4 — Audio Emotion Timeline (ECharts)
From `audio_emotion.timeline`:
- Smooth line chart
- X axis: `${timestamp_offset}s` labels (0s, 1s, 2s...)
- Y axis: 0–1 as percentage
- One line per emotion with >2% confidence in any segment
- Each line: `EMOTION_COLORS`
- Tooltip: segment index + all probabilities
- Theme-aware via `ChartThemeService` — `setOption()` on theme change, no destroy/recreate
- Responsive

### 3.5 — Final Multimodal Distribution (ECharts)
From `final_multimodal_results`:
- Horizontal bar chart, sorted by confidence
- Each bar: `EMOTION_COLORS`
- `confidence_percent` label at end of bar
- Theme-aware

### 3.6 — Three Track Comparison
Three cards side by side (stack on mobile):
- **Audio Track** — dominant from `audio_emotion.timeline` (most frequent dominant label)
- **Text Track** — `text_emotion.combined_final_emotion`
- **Fused Result** — `final_multimodal_emotion`
Each: emotion label, confidence %, category badge, emotion color accent

### 3.7 — Audio Segment Breakdown
From `audio_emotion.timeline`, one card per segment:
- Badge: `Seg ${segment_index}` + `${timestamp_offset}s`
- Dominant emotion badge (colored)
- `Weight: ${intensity_weight.toFixed(2)}`
- Mini horizontal bars for all 7 emotions (width = probability × 100%, colored)

### 3.8 — Text Emotion Section (collapsible)
From `text_emotion`, collapsed by default:
- Title: "Text Emotion Analysis (from transcription)"
- Inside: distribution bar chart from `text_emotion.combined_results` + sentence breakdown
- Reuse same card/bar style as text page

### 3.9 — Model Info Grid
Info chips same style as text page:
- `model_info.audio_model`
- `Whisper: ${model_info.whisper_model}`
- `Fusion: ${model_info.fusion_version}`
- `Duration: ${audio_emotion.duration_seconds}s`
- `Segments: ${audio_emotion.segments_count}`
- `${processing_time_ms}ms`

### 3.10 — Raw JSON (collapsible)
Collapsed by default, dark code block `#1e1e2e`, copy button.

---

## Responsive Requirements

- Mobile first — every section works on small screens
- Input tabs stack correctly on mobile
- Waveform canvas scales to container width
- Results cards go single column on mobile
- ECharts `responsive: true`
- All touch targets minimum 44px

---

## Files To Create / Modify

```
CREATE:
  src/app/features/analysis/audio/audio-analysis.component.ts
  src/app/core/services/audio-analysis.service.ts
  src/app/core/models/audio-analysis.model.ts
  src/app/shared/components/audio-waveform/audio-waveform.component.ts

MODIFY:
  src/app/app.routes.ts
  src/app/core/services/analysis-storage.service.ts
  src/app/core/models/text-analysis.model.ts  ← add AudioAnalysisSession
```

---

## Output Requirements

- Zero TODOs — every file complete and working
- `ng serve` zero errors
- Style matches text analysis page exactly
- Light and dark mode production-quality on every section
- Waveform smooth and performant, no memory leaks
- Mic permission denied handled gracefully
- Charts respond to theme changes without page reload
- Session auto-saved to localStorage after every successful analysis
- `/analysis/audio/:id` loads saved session correctly
- Fully responsive on all screen sizes
