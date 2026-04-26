# Frontend Alert System Report & Backend Requirements

This document summarizes the current state of the frontend alert integration and outlines the issues detected during testing. 

## 1. Frontend Configuration
- **Technology**: Angular using `@microsoft/signalr`.
- **Hub URL**: `https://emotion-detection.runasp.net/hubs/notifications`
- **Authentication**: Bearer Token passed via the `accessTokenFactory` in `HubConnectionBuilder`.
- **Transport**: WebSockets (with automatic fallback to Long Polling enabled).

## 2. SignalR Client Listeners
The frontend is currently configured to listen for the following method names:
- `ReceiveAlert(object alert)`
- `NewAlert(object alert)`
- `Notification(object alert)`

The expected `alert` object structure is:
```json
{
  "message": "string",
  "severity": "string", // 'low', 'medium', 'high', 'critical'
  /* ... other metadata ... */
}
```

## 3. Findings from Diagnostics
- **Connection Status**: **SUCCESSFUL**. The frontend confirms a stable `Connected` state to the notification hub over HTTPS/WSS.
- **Problem**: No messages are being received by the client-side listeners even when negative analyses (99% confidence) are completed.
- **Settings Verification**: The frontend confirmed that the user's `alert_consecutive_count` is set to `1` and `alerts_enabled` is `true`, yet no hub push was triggered.

## 4. Required Backend Investigations
The issue is localized to the **Backend Alert Broker/Trigger logic**. Please verify the following:

1. **Trigger Condition**: Ensure that the `AnalysisV2` controller correctly triggers the `AlertService` after saving a record.
2. **Emotion Mapping**: Verify that "Sadness" and other negative emotions are correctly categorized as `Negative` for the purposes of the threshold check.
3. **SignalR Broadcast**: Verify that the backend is calling:
   `await _hubContext.Clients.User(userId).SendAsync("ReceiveAlert", alertObject);`
4. **User Identification**: Ensure SignalR is correctly mapping the JWT `sub` or `NameIdentifier` claim to the backend's internal `userId` used for targeted broadcasting.
5. **Persistence**: Check if an `Alert` record is even being created in the database. If the DB record exists but the SignalR didn't fire, it's a broadcasting issue. If no record exists, it's a trigger logic issue.
