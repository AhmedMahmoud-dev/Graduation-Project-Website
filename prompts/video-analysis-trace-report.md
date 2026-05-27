# Video Analysis Cloud Save Flow Report

Based on a full review of the requested files, here is the step-by-step trace and answers to your questions regarding the `500 Internal Server Error` on `POST /api/analysis/video`.

### 1. Full Call Chain Trace
Here is the exact execution flow from clicking the start button to the HTTP POST:

1. **`VideoAnalysisComponent.startAnalysis()`**
   - Calls `this.store.startAnalysis(file)`.
2. **`VideoAnalysisStore.startAnalysis(file)`**
   - Defines the `analysis$` observable: `this.videoService.analyze(file).pipe(map(res => this.normalizeVideoResult(res)))`.
   - Calls `this.analysisBgService.startBackgroundJob({...})` passing the observable and an `onSuccess` callback.
3. **`AnalysisBgService.startBackgroundJob(config)`**
   - Generates a UUID: `const sid = crypto.randomUUID();`.
   - Subscribes to `config.analysis$`, which fires the HTTP POST to the Python AI service.
4. **`VideoAnalysisStore.normalizeVideoResult(res)`**
   - Modifies the raw Python response in the observable stream (converting `happiness` to `joy`, mapping timelines, etc.).
5. **`AnalysisBgService` (inside `next` observer)**
   - Receives the normalized result.
   - Sets `this.jobResult.set({ id: sid, result: res })` (which asynchronously triggers the UI effect in the store).
   - Synchronously calls `config.onSuccess(res, sid)`.
6. **`VideoAnalysisStore` (inside `onSuccess` callback)**
   - Calls `this.buildSessionPayload(jobId, result)`.
   - Calls `this.saveLocalSession(session)`.
   - Calls `this.orchestrationService.syncSessionToCloud(jobId, result, this.analysisType, (sid, res) => this.syncToCloud(sid, res))`.
7. **`AnalysisOrchestrationService.syncSessionToCloud(sid, result, ...)`**
   - Checks auth, then executes the callback `syncCallback(sid, result)`.
8. **`VideoAnalysisStore.syncToCloud(sid, res)`**
   - Reads the file via `const file = this.selectedFile();`.
   - Calls `this.analysisV2Service.saveVideoAnalysis(sid, result, file!)`.
9. **`AnalysisV2Service.saveVideoAnalysis(clientId, result, videoFile)`**
   - Builds a `FormData` object with `VideoFile` and stringified `Request` JSON.
   - Fires `this.http.post<ApiResponse<number>>(url, formData)`.

---

### 2. `AnalysisBgService.startBackgroundJob` details
- **What gets passed to `onSuccess`:** `config.onSuccess(res, sid)` is called.
- **`res`:** The analysis result object that has *already been normalized* by the observable pipe.
- **`jobId` (`sid`):** It is the exact original UUID generated via `crypto.randomUUID()` at the top of the function.

---

### 3. `onSuccess` inside `VideoAnalysisStore.startAnalysis()`
- **What is `jobId` at that moment?** It is exactly the same generated UUID (`sid`).

---

### 4. `buildSessionPayload(jobId, result)`
- **What does `session.id` end up being?**
  Inside this function, it returns `{ id: sid, ... }`. Therefore, `session.id` is the exact generated UUID.

---

### 5. `saveLocalSession(session)`
- **Does it use `session.id` or generate a new one?**
  It strictly uses the existing `session.id` (the UUID). It calls `this.storageService.cacheVideoBlob(session.id, file)` and `this.storageService.saveVideoSession(session)` without modifying the ID.

---

### 6. `syncSessionToCloud(jobId, result, ...)`
- **What is `jobId` here?** It is still the exact same UUID.
- **Is it the same value passed to `saveVideoAnalysis` as `clientId`?** Yes. `jobId` is passed all the way down the callback chain unchanged and maps directly to the `client_id` in the JSON request payload.

---

### 7. Double Normalization in `normalizeVideoResult`
- **Is it being called more than once?** **Yes.**
  1. Once in the `analysis$` pipe inside `startAnalysis`.
  2. Once in the `VideoAnalysisStore` constructor's `effect()`, which reacts to `jobResult` and updates the UI state.
- **Could this cause a 500?** The double execution itself is mostly idempotent (`mapLabel('joy')` just returns `'joy'`). However, the fact that `normalizeVideoResult` is inside the `analysis$` pipe is the critical issue. Because it's in the pipe, **the C# backend receives the normalized data, not the raw data.** 
- **The Broken State:** `normalizeVideoResult` strips out the `happiness` key from the timeline probabilities and renames it to `joy`. According to your API documentation (`video endpoint.md`), the C# backend specifically expects `"happiness": 0.7911` for Video results, not `joy`. If the C# backend strongly types the probabilities object and requires `happiness`, it will fail to deserialize or validate the missing key, throwing a `500 Internal Server Error`.

---

### 8. Actual FormData structure
- **Is `VideoFile` actually a File object?** Yes. `syncToCloud` gets it via `this.selectedFile()`. Because the signal evaluation is synchronous within the callback execution, the file has not been cleared yet and is successfully appended to the FormData.
- **Is `Request` valid JSON?** Syntactically, yes. Structurally, no. 
  Because `result` was intercepted by `normalizeVideoResult`, the JSON payload sent to C# looks like this:
  ```json
  "probabilities": {
    "anger": 0.0072,
    "joy": 0.7911,       // <--- Backend expects "happiness"
    "neutral": 0.0002,
    ...
  }
  ```
  The payload is structurally broken from the C# backend's perspective. It expects the raw Python output, but it receives UI-mapped variables.