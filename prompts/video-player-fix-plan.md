# Video Player Bug Fix Plan (Updated: Deep Dive)

## Bug 1: Progress Bar Stuck on First Play (The 3-Second Threshold)
**Symptom:** Videos 3 seconds or less work fine. Videos longer than 3 seconds have a progress bar stuck at the start, which jumps to the correct position after a few seconds. Replay works perfectly.

### 1. Root Cause Analysis (New Findings)
The root cause lies in how Chromium browsers handle `MediaRecorder` WebM Blobs, combined with a hardcoded fallback in the `syncSliderDOM()` logic.

1. **The WebM Infinity Bug:** Video files recorded via the webcam (`MediaRecorder`) are saved as WebM blobs. By design, these files lack duration metadata in their headers. When the `<video>` element loads a Blob URL, `video.duration` is initially set to `Infinity`.
2. **The 3-Second Boundary:** 
   - For very short videos (≤ 3 seconds), the file size is so small that Chrome's media pipeline parses the entire blob into memory almost instantly, resolving `Infinity` to the actual duration before playback even begins.
   - For longer videos (> 3 seconds), Chrome streams the blob. It takes the background buffer a few seconds to reach the end of the file. During this time, `video.duration` remains `Infinity`.
3. **The Logic Failure:** In `video-player.component.ts`, the `refreshDuration` and `tick` methods strictly check `isFinite(video.duration)`. Because the duration is `Infinity`, `this._duration` remains `0`.
4. **The "Stuck" State:** The `syncSliderDOM()` method contains this line:
   `slider.value = dur > 0 ? time.toString() : '0';`
   As long as `dur` is `0`, the thumb is explicitly forced to stay at `0`, ignoring the advancing `currentTime`.
5. **The "Jump":** Once Chrome finishes scanning the file in the background (usually ~3 seconds in), `video.duration` finally becomes a finite number. The loop catches this, updates `this._duration`, and the slider instantly jumps to the correct `currentTime`.

### 2. Precise Fix
We must implement the industry-standard workaround for the Chromium WebM `Infinity` duration bug directly inside the video player, forcing the browser to resolve the duration immediately upon load.

**Changes in `video-player.component.ts`:**
- Update `onLoadedMetadata()` to detect `Infinity` and force a duration resolution by temporarily seeking to the end of the file:
```typescript
  onLoadedMetadata() {
    const video = this.videoElement.nativeElement;
    
    // Workaround for Chrome WebM Blob duration bug
    if (video.duration === Infinity) {
      // Seek to a massive number to force browser to calculate true duration
      video.currentTime = 1e10; 
      
      const resolveDuration = () => {
        if (video.duration !== Infinity) {
          video.currentTime = 0; // Reset back to start
          this.refreshDuration(video);
          this.syncSliderDOM();
          video.removeEventListener('durationchange', resolveDuration);
        }
      };
      video.addEventListener('durationchange', resolveDuration);
      return;
    }

    this.refreshDuration(video);
    this.syncSliderDOM();
  }
```

---

## Bug 2: Gap Between Slider Thumb and Fill
**Symptom:** There is a visible gap between the colored fill and the thumb circle at all positions.

### 1. Root Cause Analysis
This is a mathematical misalignment between how the browser positions the thumb and how the CSS `background-size` fills the track.
- **The Thumb:** In `-webkit-appearance: none` sliders, the thumb's center moves within a range of `(TrackWidth - ThumbWidth)`.
- **The Fill:** The current logic uses `background-size: X% 100%`, which fills exactly `X%` of the `TrackWidth`. 
- **The Result:** At 0%, the fill is at 0px, but the thumb center is at 6px (for a 12px thumb), creating a **6px gap**.

### 2. Precise Fix
The `background-size` calculation must be adjusted to account for the thumb's radius so that the edge of the fill always lands exactly at the center of the thumb.

**Changes in `video-player.component.ts` (`syncSliderDOM` method):**
- Update the `backgroundSize` string assignment to use a `calc()` formula:
  `calc(percentage% + (0.5 - percentage/100) * thumbWidth)`
- For the progress slider (12px thumb): `calc(${clamped}% + ${(0.5 - clamped / 100) * 12}px) 100%`

**Changes in `video-player.component.html` (Volume slider):**
- Apply the same `calc` logic to the volume slider's inline style, using its specific thumb width (10px).

**Changes in `video-player.component.css`:**
- Ensure the thumb is vertically centered on the 4px track.
- Add `margin-top: -4px;` to `.progress-slider::-webkit-slider-thumb`.
- Add `margin-top: -3.5px;` to the volume slider thumb.

## Summary of Planned Changes
| File | Change Type | Description |
| :--- | :--- | :--- |
| `video-player.component.ts` | Logic | Update `onLoadedMetadata` with the `1e10` seek workaround for `Infinity` duration. |
| `video-player.component.ts` | Logic | Update `syncSliderDOM` to use the `calc()`-based `backgroundSize` formula. |
| `video-player.component.html` | Template | Update volume slider `background-size` with the `calc()` formula. |
| `video-player.component.css` | Styling | Add `margin-top` to thumbs for perfect vertical alignment. |
