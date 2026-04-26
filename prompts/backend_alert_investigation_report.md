# Backend Alert System Investigation Report

## 1. Trigger Points
The alert evaluation logic is triggered directly within the **`AnalysisV2Controller.cs`** after a successful analysis save operation. It is executed in a background thread to ensure the API response remains fast.

**Exact Locations:**
- **Text Analysis:** [AnalysisV2Controller.cs:L56-61](file:///c:/Graduation%20Project/Backend/EmotionDetectionSolution/EmotionDetection/Controllers/V2/AnalysisV2Controller.cs#L56-61)
- **Audio Analysis:** [AnalysisV2Controller.cs:L110-119](file:///c:/Graduation%20Project/Backend/EmotionDetectionSolution/EmotionDetection/Controllers/V2/AnalysisV2Controller.cs#L110-119)

```csharp
// Example from Text Endpoint
if (response.IsSuccess && response.Data > 0)
{
    var analysisId = response.Data;
    _ = Task.Run(async () =>
    {
        using var scope = _scopeFactory.CreateScope();
        var alertService = scope.ServiceProvider.GetRequiredService<IAlertService>();
        await alertService.CheckAndCreateAlertAsync(analysisId);
    });
}
```

---

## 2. Threshold Evaluation Logic
The evaluation happens in **`AlertService.cs`**. The system reads user settings from the `UserSettings` table, specifically parsing the `AlertSettingsJson` blob.

**The Condition for Triggering:**
The primary condition is **`negativeRatio >= alertSettings.AlertNegativeThreshold`**. 
- `negativeRatio` is calculated by summing the confidence scores of "anger", "disgust", "fear", and "sadness" from the `combined_results` or `final_multimodal_results` JSON array in `RawJsonResult`.
- If `RawJsonResult` is missing, it falls back to checking the `DominantEmotion` field.

**Code Reference:** [AlertService.cs:L131](file:///c:/Graduation%20Project/Backend/EmotionDetectionSolution/Core/Service/AlertService%20.cs#L131)

---

## 3. Consecutive Count Tracking
The consecutive count is **not** stored as a simple incrementing counter. Instead, it is **calculated dynamically** for every new analysis.

- **Storage:** No dedicated counter field. It uses the `Analyses` table history.
- **Increment/Reset:** It queries the database for the most recent `N` analyses (where `N` is your `AlertConsecutiveCount`). It then recalculates the `negativeRatio` for each individual record in that window.
- **Logic:** If **any** analysis in that window fails to meet the threshold, the alert is suppressed (`consecutiveMet = false`). This effectively "resets" the count if a neutral or positive result appears.

**Code Reference:** [AlertService.cs:L134-199](file:///c:/Graduation%20Project/Backend/EmotionDetectionSolution/Core/Service/AlertService%20.cs#L134-199)

---

## 4. Debug Output Added
I have added a temporary debug log in **`AlertService.cs`** right before the SignalR message is dispatched. 

**Code added:**
```csharp
_logger.LogInformation(
    "DEBUG: Sending SignalR Alert. NegativeRatio: {NegRatio}, Threshold: {Threshold}, ReqConsecutive: {ReqCount}, ActualConsecutiveFound: {ActualCount}",
    negativeRatio, 
    alertSettings.AlertNegativeThreshold, 
    alertSettings.AlertConsecutiveCount, 
    recentAnalyses?.Count ?? 1);
```

**Interpretation of Values:**
- **NegativeRatio:** The sum of negative emotion confidences (should be 0.0 to 1.0).
- **Threshold:** The user's saved threshold (default 0.7). **Check if this is accidentally saved as 70.0/90.0 in the DB!**
- **ReqConsecutive:** The `alert_consecutive_count` setting.
- **ActualConsecutiveFound:** The number of recent records it actually scanned.

---

## 5. Potential Silent Blockers
I identified several conditions that could silently prevent the SignalR message from being sent:

1. **`alertSettings.AlertsEnabled` is False:** Line 67. If this is disabled in settings, research stops immediately.
2. **`alertSettings.PushNotifications` is False:** Line 220. If this is toggled off, the record is saved to the database but **no SignalR message is sent**.
3. **Missing Hub Group Membership:** The SignalR service uses `.Group(userId)`. The frontend **must** call the hub method `JoinUserGroup()` after connecting, or it won't receive messages targeted at its ID.
4. **Duplicate Analysis ID:** Line 40 checks `existingAlert`. If an alert already exists for that specific `analysisId`, it skips.
5. **Threshold Scale Mismatch:** If the backend expects `0.9` (90%) but the UI saved `90.0`, the condition `0.9 >= 90.0` will never be true.
6. **Background Task Failure:** Since the evaluation runs in `Task.Run`, if the server process restarts or hits an unhandled exception before the logic executes, the alert is lost.

---

### Critical Observations for Bug Fixing:
The most likely culprit is either the **Threshold Scale Mismatch** (decimal vs whole number) or the **PushNotifications flag** in the settings JSON being false. Another high probability is the frontend failing to call **`JoinUserGroup()`** on the SignalR hub.
