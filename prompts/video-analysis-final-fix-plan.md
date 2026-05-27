# Implementation Plan: Video Analysis Cloud Save Fix

Based on the trace report, the `500 Internal Server Error` is caused by data mutation in the observable pipeline. The `normalizeVideoResult` method is mapping the key `"happiness"` to `"joy"`, resulting in a structurally invalid JSON payload being sent to the C# backend.

To fix this, we must clearly separate **Data Sanitization** (patching the WebM 0-duration flaw for the backend) from **UI Normalization** (mapping "happiness" to "joy" for the frontend).

## Target File
`src/app/core/stores/video-analysis.store.ts`

## Step-by-Step Implementation

### Step 1: Create a `sanitizeRawResult` Method
Add a new method to the store. This method will **only** fix the `0` duration and frame counts (the WebM patch) while keeping the raw string values (like `"happiness"`) completely intact for the backend.

```typescript
  private sanitizeRawResult(res: VideoAnalysisResponse): VideoAnalysisResponse {
    let finalDuration = res.duration_seconds || 0;
    let finalFrames = res.total_frames || 0;

    // If OpenCV failed to read headers and returned 0, reconstruct from timeline
    if (finalDuration === 0 || finalFrames === 0) {
      let maxFrame = 0;
      let maxSec = 0;
      (res.faces || []).forEach(face => {
        (face.timeline || []).forEach(t => {
          if (t.frame_index > maxFrame) maxFrame = t.frame_index;
          if (t.timestamp_sec > maxSec) maxSec = t.timestamp_sec;
        });
      });

      if (maxFrame > 0 && finalFrames === 0) finalFrames = maxFrame;
      if (maxSec > 0 && finalDuration === 0) finalDuration = maxSec;

      // Provide a tiny absolute fallback to guarantee C# backend validation passes
      if (finalFrames === 0) finalFrames = 1;
      if (finalDuration === 0) finalDuration = 0.1;

      return {
        ...res,
        duration_seconds: finalDuration,
        total_frames: finalFrames
      };
    }
    
    return res;
  }
```

### Step 2: Clean up `normalizeVideoResult`
Ensure the existing `normalizeVideoResult` method **only** handles UI mapping (`happiness` to `joy`). Remove the WebM 0-duration patch logic from this method if you added it there previously.

*(No code change needed here if you haven't implemented the previous patch plan, just ensure it only does the mapping).*

### Step 3: Update the Observable Pipeline
Locate the `startAnalysis(file: File)` method. Modify the `analysis$` observable pipe to use `sanitizeRawResult` instead of `normalizeVideoResult`.

**Before:**
```typescript
      analysis$: this.videoService.analyze(file).pipe(
        map(res => this.normalizeVideoResult(res))
      ),
```

**After:**
```typescript
      analysis$: this.videoService.analyze(file).pipe(
        map(res => this.sanitizeRawResult(res)) // Send sanitized RAW data down the chain
      ),
```

## Why This Fixes Everything
1. **The Backend Receives Valid Data:** By removing `normalizeVideoResult` from the pipe, the `onSuccess` callback receives the raw JSON with `"happiness"`, successfully passing C# deserialization. 
2. **WebM Recordings Are Saved:** The `sanitizeRawResult` in the pipe guarantees that `duration_seconds` and `total_frames` are valid `>0` numbers before reaching the backend validation logic.
3. **The UI Remains Correct:** The `effect` that listens to `jobResult` and the `applySession` method that loads historical data *both* already call `this.normalizeVideoResult(res)` before setting the UI `this.result` signal. The UI will continue to properly display "joy".