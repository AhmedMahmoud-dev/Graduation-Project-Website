# SignalR Alerts System Documentation

This document explains the end-to-end functionality of the SignalR-based real-time alerts system in the application.

## 1. How the SignalR connection is established and when

The SignalR connection is managed by the `AlertsService` and is lifecycle-bound to the user's authentication state.

- **Initialization**: The connection is established via the `initSignalR(token)` method in `AlertsService`.
- **When**:
  - **On Login**: Immediately after a user successfully logs in (`AuthService.login`).
  - **On App Load**: If a user is already authenticated when the application starts (in the `AuthService` constructor).
- **Mechanism**: It uses the `@microsoft/signalr` library to build a `HubConnection`.
- **Endpoint**: It connects to `${environment.apiUrl}/hubs/notifications` using the user's JWT token for authentication.
- **Resilience**: It is configured with `withAutomaticReconnect()` to handle network instability and falls back to Long Polling if WebSockets are unavailable.

## 2. What event names it listens to

The system listens for three specific event names from the server to ensure compatibility across different hub implementations:

1.  **`ReceiveAlert`**: The primary event for incoming alert objects.
2.  **`NewAlert`**: An alternative event name used by some hub versions.
3.  **`Notification`**: A generic fallback event name.

All three events are handled by the same function: `handleIncomingAlert(alert)`.

## 3. What triggers an alert to appear

An alert is triggered through the following sequence:

1.  **Backend Broadcast**: The backend hub sends a message to the user's SignalR connection.
2.  **Frontend Handling**: `AlertsService.handleIncomingAlert` receives the object.
3.  **Visual Notification**:
    - **Toast Service**: A toast appears at the top/bottom of the screen (via `ToastService.show`).
    - **Unread Signal**: The `unreadCount` signal in `AlertsService` is incremented, which updates the notification bell icon across the navigation bar reactively.
4.  **Component Notification**: If any component (like the Alerts page) has registered an `onReceiveAlert` callback, it is executed.
5.  **Backup Trigger**: A background interval (`startPolling`) runs every **60 seconds**, fetching stats from the REST API to ensure the UI remains in sync even if SignalR drops.

## 4. What the threshold logic is

The conditions for generating an alert are defined by the user in the "Settings" page and stored in the database.

- **User Settings**: The `AlertSettings` interface (found in `src/app/core/models/alert.models.ts`) defines three key parameters:
  - **`alert_negative_threshold`**: The threshold value for negative emotion detection.
  - **`alert_consecutive_count`**: The number of consecutive sessions that must meet the threshold before an alert is fired.
  - **`alert_severity_level`**: The severity assigned to the resulting alert (Low, Medium, High, Critical).
- **Implementation**: While these values are stored in `localStorage` for the UI, the **actual logic and evaluation** happen on the backend server. The backend checks these thresholds during analysis and decides whether to send a SignalR message.

## 5. Where the alert data is stored

The system uses multiple storage strategies for different purposes:

| Storage Type       | Location                    | Usage                                                      |
| :----------------- | :-------------------------- | :--------------------------------------------------------- |
| **Angular Signal** | `AlertsService.unreadCount` | Reactive, real-time count of unread alerts for the Navbar. |
| **Angular Signal** | `AlertsComponent.alerts`    | Reactive list of alert items for the Alerts page UI.       |
| **LocalStorage**   | `emotra_alert_settings`     | Caches user threshold preferences.                         |
| **LocalStorage**   | `emotra_alerts_meta`        | Caches the list of alerts for fast "instant-load" UX.      |
| **LocalStorage**   | `emotra_alerts_stats`       | Caches alert stats (total count, severity breakdowns).     |

## Related Files Used for this Analysis

- **Service**: `src/app/core/services/alerts.service.ts`
- **Component**: `src/app/features/alerts/alerts.component.ts`
- **Model**: `src/app/core/models/alert.model.ts`
- **Settings Model**: `src/app/core/models/alert.models.ts`
