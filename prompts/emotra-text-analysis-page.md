# Emotra — Text Analysis Page

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
- `src/app/core/services/text-analysis.service.ts`
- `src/app/core/models/text-analysis.model.ts`
- `src/app/features/analysis/text/text-analysis.component.ts`
- `src/app/layouts/app-layout/app-layout.component.ts`
- `src/styles.css` (for CSS variables and theme setup)

---

## Route

```
/analysis/text  →  AppLayout  →  TextAnalysisComponent  [AuthGuard]
```

---

## Design System

### CSS Variables (already defined — use them everywhere)

```
--color-bg           (page background)
--color-surface      (card background)
--color-border       (borders)
--color-text         (primary text)
--color-text-muted   (secondary text)
--color-primary      (#6c63ff — brand purple)
--color-accent       (#00d4aa — teal)
```

### Emotion Color Map (use these exact colors everywhere — charts, badges, bars)

```typescript
const EMOTION_COLORS = {
  anger: "#ff4757",
  disgust: "#a29bfe",
  fear: "#fd9644",
  joy: "#ffd32a",
  neutral: "#778ca3",
  sadness: "#4a90d9",
  surprise: "#00d4aa",
};
```

---

## Analysis Session ID & localStorage

### Every analysis must generate a unique session ID:

```typescript
import { v4 as uuidv4 } from "uuid"; // or use crypto.randomUUID()
const sessionId = crypto.randomUUID();
```

### Data model for a saved session:

```typescript
// Add to core/models/text-analysis.model.ts
export interface AnalysisSession {
  id: string; // unique session ID
  type: "text"; // modality type (future-proof)
  timestamp: string; // ISO string
  input: string; // the original text input
  result: TextAnalysisResponse; // full API response
}
```

### localStorage service — create `core/services/analysis-storage.service.ts`:

```typescript
// IMPORTANT: Design this service to be easily swappable to an API later.
// Use a clean interface so the component never touches localStorage directly.
// All storage logic is isolated here only.

@Injectable({ providedIn: 'root' })
export class AnalysisStorageService {
  private readonly STORAGE_KEY = 'emotra_analysis_sessions';

  saveSession(session: AnalysisSession): void { ... }
  getSessions(): AnalysisSession[] { ... }
  getSessionById(id: string): AnalysisSession | null { ... }
  deleteSession(id: string): void { ... }
  clearAll(): void { ... }
}
```

**Design note for agent:** Keep storage logic 100% inside this service. When we later replace localStorage with real API calls, only this service changes — zero changes in components.

---

## Page States

The page has exactly 3 states managed by a Signal:

```typescript
type PageState = "input" | "loading" | "results";
state = signal<PageState>("input");
```

---

## State 1 — Input

- Large centered textarea, min height 160px
- Placeholder: `"Enter text to analyze emotions..."`
- Live counters below textarea (update as user types):
  - Characters: `X / 2000`
  - Tokens (estimate): `~X tokens` (estimate: `Math.round(chars / 4)`)
  - Sentences: count splits on `.!?`
- "Analyze" button — brand primary color, disabled if textarea is empty or whitespace-only
- Button shows a spinner icon when loading starts

### Light & Dark mode:

- Textarea background: `var(--color-surface)`
- Textarea border: `var(--color-border)`, on focus: `var(--color-primary)`
- Counter text: `var(--color-text-muted)`

---

## State 2 — Loading

Centered on page, full height feel:

- Animated pulsing brain icon (use an SVG brain or emoji `🧠` with pulse CSS animation)
- Cycling step messages — change every 1.5 seconds:
  1. "Preparing your text..."
  2. "Splitting into sentences..."
  3. "Analyzing sentence emotions..."
  4. "Calculating intensity weights..."
  5. "Running full text analysis..."
  6. "Merging results..."
  7. "Building your timeline..."
- Progress dots or a thin animated progress bar at the bottom using `--color-primary`

---

## State 3 — Results

Show results in this exact order:

### 3.1 — Top Bar

- Session ID badge (small, monospace font): `Session #xxxxxxxx` (first 8 chars of ID)
- "New Analysis" button on the right → resets to input state
- "Copy ID" icon button next to session badge

### 3.2 — Dominant Emotion Card

Large hero card, full width:

- Big emotion label: e.g. `FEAR`
- Confidence percent: e.g. `69.3%`
- Category badge: `Negative` / `Positive` / `Neutral`
- Left border or background tint using the emotion's color from `EMOTION_COLORS`
- In dark mode: use a subtle glow or tinted background, not a harsh solid color
- In light mode: use a light tint of the emotion color as background

### 3.3 — Emotion Timeline Chart (ECharts)

This is the most important visual. Make it perfect.

- Type: Line chart with smooth curves
- X axis: sentence numbers (`S1`, `S2`, `S3`...)
- Y axis: confidence (0 to 1), labeled as percentage
- One line per emotion — only show emotions that appear with >2% confidence in any sentence
- Each line uses its color from `EMOTION_COLORS`
- Data points are dots — on hover show tooltip with sentence text + all emotion scores
- Legend below the chart showing which color = which emotion
- **Theme awareness (critical):**
  - Light mode: white background, dark axis text, light grid lines (`rgba(0,0,0,0.08)`)
  - Dark mode: transparent background, light axis text (`#a0aec0`), dark grid lines (`rgba(255,255,255,0.06)`)
  - Inject `ChartThemeService` and subscribe to theme changes to update chart options reactively
  - Use `echartsInstance.setOption()` when theme changes — do NOT destroy and recreate
- Responsive: chart resizes with window

### 3.4 — Emotion Distribution (ECharts)

- Type: Horizontal bar chart
- Data from `combined_results` (all 7 emotions, sorted by confidence)
- Each bar uses the emotion's color from `EMOTION_COLORS`
- X axis: percentage (0–100%)
- Show percentage label at end of each bar
- Same theme-awareness as timeline chart above
- Height: auto based on number of bars

### 3.5 — Analysis Tracks Comparison

Two cards side by side (stack on mobile):

- Left card: "Sentence Track" — dominant from `combined_final_emotion`
- Right card: "Full Text Track" — dominant from `full_text_analysis.dominant`
- Each card shows: emotion label, confidence %, category badge, emotion color accent
- Same theme-aware styling

### 3.6 — Sentence Breakdown

Section title: "Sentence Breakdown"
One card per sentence from `sentences_analysis`:

- Sentence number badge + sentence text
- Dominant emotion badge (colored with `EMOTION_COLORS`)
- Intensity weight badge: e.g. `Weight: 2.2`
- Mini horizontal bars for all 7 emotions — each bar colored with `EMOTION_COLORS`
- Bar width = probability × 100%
- In dark mode: card background `var(--color-surface)`, border `var(--color-border)`
- In light mode: white card with subtle shadow

### 3.7 — Model Info Grid

4 info chips in a row (wrap on mobile):

- Model name
- Processing time: `Xms`
- Token count
- Device used (CPU / GPU)
- Truncated warning (only shown if `input_was_truncated === true`, in orange)

### 3.8 — Raw JSON (collapsible)

- Collapsed by default
- Toggle button: "Show Raw JSON" / "Hide Raw JSON"
- Dark code block (`#1e1e2e` background, always dark regardless of theme)
- Pretty-printed JSON
- Copy button

---

## API Integration

```typescript
// core/services/text-analysis.service.ts
// POST to environment.apiUrl + '/emotion/text_model'
// Body: { "text": "..." }
// Returns: TextAnalysisResponse
```

**After successful API response:**

1. Generate `crypto.randomUUID()` as session ID
2. Build `AnalysisSession` object
3. Call `analysisStorageService.saveSession(session)`
4. Show results state

---

## Real API Response Structure (for reference)

```json
{
  "text": "...",
  "sentences_count": 3,
  "sentences_analysis": [
    {
      "sentence": "...",
      "probabilities": { "anger": 0.03, "disgust": 0.15, "fear": 0.04, "joy": 0.05, "neutral": 0.61, "sadness": 0.07, "surprise": 0.05 },
      "dominant": { "label": "neutral", "confidence": 0.61, "category": "neutral" },
      "intensity_weight": 1.0
    }
  ],
  "full_text_analysis": {
    "probabilities": { ... },
    "dominant": { "label": "neutral", "confidence": 0.78, "category": "neutral" }
  },
  "combined_final_emotion": {
    "label": "neutral", "confidence": 0.77, "confidence_percent": 77.25, "category": "neutral"
  },
  "combined_results": [
    { "label": "neutral", "confidence": 0.77, "confidence_percent": 77.25 },
    ...
  ],
  "input_info": { "input_length": 46, "token_count": 11, "input_was_truncated": false },
  "timestamp": "2026-03-23T13:12:53.406608",
  "processing_time_ms": 466.313,
  "model_info": {
    "name": "j-hartmann/emotion-english-distilroberta-base",
    "version": "weighted-intensity-v3",
    "device_used": "cpu"
  }
}
```

---

## Theme Rules (apply to EVERYTHING)

- **Never hardcode colors** — use CSS variables or `EMOTION_COLORS` map only
- **Dark mode:** surfaces are dark (`var(--color-surface)`), text is light, borders subtle
- **Light mode:** surfaces are white/off-white, text is dark, use subtle shadows instead of borders
- **Charts:** must subscribe to theme changes and update ECharts options reactively
- **Emotion colors:** same in both modes — they are identity colors, not theme colors
- Test mentally: does every element look good in both modes before finalizing?

---

## Files To Create / Modify

```
MODIFY:
  src/app/core/models/text-analysis.model.ts       ← add AnalysisSession interface
  src/app/features/analysis/text/text-analysis.component.ts  ← full rewrite

CREATE:
  src/app/core/services/analysis-storage.service.ts  ← new localStorage service
```

Do NOT create new services or models files beyond these unless necessary.

---

## Output Requirements

- Zero TODOs — every file complete and working
- `ng serve` must have zero errors
- Both light and dark mode must look production-quality — test every section mentally
- Charts must respond to theme changes without page reload
- localStorage save must happen automatically after every successful analysis
- Session ID must be visible in results and copyable
- The storage service must be clean and easy to swap to an API — add a comment explaining how
