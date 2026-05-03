import { Injectable, signal, inject, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Subject, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ToastService } from './toast.service';
import { HubConnection, HubConnectionBuilder, LogLevel } from '@microsoft/signalr';

import { AlertItem, AlertStats, AlertSettings } from '../models/alert.model';
import { NotificationSettingsService } from './notification-settings.service';
import { ApiResponse, BanDetails } from '../models/api-response.model';

@Injectable({
  providedIn: 'root'
})
export class AlertsService {
  private http = inject(HttpClient);
  private toastService = inject(ToastService);
  private settingsService = inject(NotificationSettingsService);

  // Single source of truth for alert statistics
  stats = signal<AlertStats>({
    total_alerts: 0,
    unread_alerts: 0,
    critical_alerts: 0,
    high_alerts: 0
  });

  // Computed unread count for UI components (like Navbar/Sidebar)
  unreadCount = computed(() => this.stats().unread_alerts);

  private hubConnection: HubConnection | null = null;
  private pollingIntervalId: ReturnType<typeof setTimeout> | null = null;
  isApiAvailable = signal<boolean>(true);
  private consecutiveFailures = 0;
  private currentPollingDelay = 60000;
  private alertSubject = new Subject<AlertItem>();
  public alert$ = this.alertSubject.asObservable();
  public forceLogout$ = new Subject<BanDetails | null>();

  constructor() {
    this.initializeFromLocalStorage();
  }

  private initializeFromLocalStorage() {
    try {
      const stats = localStorage.getItem('emotra_alerts_stats');
      if (stats) {
        const parsed = JSON.parse(stats);
        this.stats.set(parsed);
      }
    } catch (e) {
      console.warn('AlertsService: Failed to parse alerts stats from localStorage.', e);
    }
  }

  initSignalR(token: string) {
    if (this.hubConnection) {
      return;
    }

    this.hubConnection = new HubConnectionBuilder()
      .withUrl(`${environment.apiUrl}/hubs/notifications`, {
        accessTokenFactory: () => token,
        // Allow falling back to Long Polling if WebSockets are blocked/unstable
        skipNegotiation: false
      })
      .configureLogging(LogLevel.Warning)
      .withAutomaticReconnect()
      .build();

    this.hubConnection.onclose(_ => {
      // Cleanly handled by automatic reconnect
    });

    this.hubConnection.on('ReceiveAlert', (alert) => {
      this.handleIncomingAlert(alert);
    });

    this.hubConnection.on('NewAlert', (alert) => {
      this.handleIncomingAlert(alert);
    });

    this.hubConnection.on('Notification', (alert) => {
      this.handleIncomingAlert(alert);
    });

    this.hubConnection.on('ReceiveSupportReply', (alert) => {
      if (alert && typeof alert === 'object') alert.type = 'support_reply';
      this.handleIncomingAlert(alert);
    });

    this.hubConnection.on('SupportReply', (alert) => {
      if (alert && typeof alert === 'object') alert.type = 'support_reply';
      this.handleIncomingAlert(alert);
    });

    this.hubConnection.on('ReceiveForceLogout', (payload?: BanDetails | string) => {
      // payload could be a string (message) or an object { ban_reason, ban_expires_at, is_permanent }
      const banDetails = typeof payload === 'object' ? payload : null;
      const message = typeof payload === 'string' ? payload : null;

      this.toastService.show(
        'Session Terminated',
        message || (banDetails?.ban_reason ? `Banned: ${banDetails.ban_reason}` : 'Your account has been restricted or banned.'),
        'error',
        'error',
        { 
          duration: this.settingsService.settings().alertPersistence, 
          isAlert: true, 
          severity: 'critical' 
        }
      );
      if (banDetails?.ban_reason) {
        sessionStorage.setItem('emotra_ban_details', JSON.stringify(banDetails));
      }
      this.forceLogout$.next(banDetails);
    });

    this.hubConnection.start()
      .then(() => this.hubConnection?.invoke('JoinUserGroup'))
      .catch((err) => {
        // If connection was aborted due to ban (hub sends ReceiveForceLogout before aborting),
        // the forceLogout$ will handle it. Only show the connection error toast if no ban details
        // were already stored (meaning it's a real network issue, not a ban rejection).
        const isBanned = !!sessionStorage.getItem('emotra_ban_details');
        if (!isBanned) {
          this.toastService.show('Connection Error', 'Real-time alerts may not work. Please refresh.', 'error', 'wifi-off');
        }
      });

    this.hubConnection.onreconnecting(_ => { });
    this.hubConnection.onreconnected(_ => { });

    // Start backup polling
    this.startPolling();
  }

  stopSignalR() {
    if (this.hubConnection) {
      this.hubConnection.stop();
      this.hubConnection = null;
    }
    this.stopPolling();
  }

  fetchStats() {
    if (!this.isUserAuthenticated()) return;

    this.http.get<ApiResponse<AlertStats>>(`${environment.apiUrl}/api/alerts/stats`).subscribe({
      next: (res) => {
        if (res.is_success && res.data) {
          this.stats.set(res.data);
          this.updateLocalStorageStats(res.data);
          this.handleApiSuccess();
        }
      },
      error: (err) => {
        console.error('AlertsService: Failed to fetch alert stats', err);
        this.handleApiFailure();
      }
    });
  }

  fetchSettings() {
    if (!this.isUserAuthenticated()) return;

    this.http.get<ApiResponse<AlertSettings>>(`${environment.apiUrl}/api/settings/alerts`).subscribe({
      next: (res) => {
        if (res.is_success && res.data) {
          try {
            localStorage.setItem('emotra_alert_settings', JSON.stringify(res.data));
            this.handleApiSuccess();
          } catch (e) {
            console.warn('AlertsService: Failed to save alert settings to localStorage', e);
          }
        }
      },
      error: (err) => {
        console.error('AlertsService: Failed to fetch alert settings', err);
        this.handleApiFailure();
      }
    });
  }

  updateSettings(settings: AlertSettings): Observable<ApiResponse<AlertSettings>> {
    return this.http.put<ApiResponse<AlertSettings>>(`${environment.apiUrl}/api/settings/alerts`, settings);
  }

  private handleIncomingAlert(alert: AlertItem | ApiResponse<AlertItem> | string) {
    if (!alert) return;

    // 1. Handle ApiResponse wrapper if present (common for consistency)
    const alertObj = alert as any;
    const data = alertObj.is_success && alertObj.data ? alertObj.data : alertObj;

    // 2. Extract message (handles snake_case, PascalCase, and direct alert object)
    const message = data.message || data.Message ||
      (typeof alert === 'string' ? alert : 'You have a new alert.');

    // 3. Extract severity
    const severity = data.severity || data.Severity || 'info';

    // 4. Capture type for mapping (defaults to emotion_spike)
    data.type = data.type || data.Type || 'emotion_spike';

    this.stats.update(s => {
      const newStats = {
        ...s,
        unread_alerts: s.unread_alerts + 1,
        total_alerts: s.total_alerts + 1
      };
      if (severity === 'critical') newStats.critical_alerts++;
      if (severity === 'high') newStats.high_alerts++;

      this.updateLocalStorageStats(newStats);
      return newStats;
    });

    this.toastService.show(
      'New Alert',
      message,
      severity === 'critical' ? 'error' : (severity === 'high' ? 'warning' : 'info'),
      'bell',
      {
        duration: this.settingsService.settings().alertPersistence,
        isAlert: true,
        severity: severity,
        alertType: data.type
      }
    );

    this.alertSubject.next(data);
  }

  decrementUnread() {
    this.stats.update(s => {
      const newStats = {
        ...s,
        unread_alerts: Math.max(0, s.unread_alerts - 1)
      };
      this.updateLocalStorageStats(newStats);
      return newStats;
    });
  }

  handleAlertResolved(item: AlertItem) {
    this.stats.update(s => {
      const newStats = {
        ...s,
        unread_alerts: Math.max(0, s.unread_alerts - 1)
      };

      const sev = item.severity?.toLowerCase();
      if (sev === 'critical') newStats.critical_alerts = Math.max(0, s.critical_alerts - 1);
      if (sev === 'high') newStats.high_alerts = Math.max(0, s.high_alerts - 1);

      this.updateLocalStorageStats(newStats);
      return newStats;
    });
  }

  handleAlertDeleted(item: AlertItem) {
    this.stats.update(s => {
      const newStats = {
        ...s,
        total_alerts: Math.max(0, s.total_alerts - 1)
      };

      if (!item.resolved) {
        newStats.unread_alerts = Math.max(0, s.unread_alerts - 1);
      }

      const sev = item.severity?.toLowerCase();
      if (sev === 'critical') newStats.critical_alerts = Math.max(0, s.critical_alerts - 1);
      if (sev === 'high') newStats.high_alerts = Math.max(0, s.high_alerts - 1);

      this.updateLocalStorageStats(newStats);
      return newStats;
    });
  }

  updateFullStats(newStats: AlertStats) {
    this.stats.set(newStats);
    this.updateLocalStorageStats(newStats);
  }

  private updateLocalStorageStats(data: AlertStats) {
    try {
      localStorage.setItem('emotra_alerts_stats', JSON.stringify(data));
    } catch (e) {
      console.warn('AlertsService: Failed to save alerts stats to localStorage. Quota exceeded?', e);
    }
  }


  // Backup polling with exponential backoff
  private startPolling() {
    this.stopPolling();
    this.pollingIntervalId = setTimeout(() => {
      this.fetchStats();
      this.startPolling();
    }, this.currentPollingDelay);
  }

  private stopPolling() {
    if (this.pollingIntervalId) {
      clearTimeout(this.pollingIntervalId);
      this.pollingIntervalId = null;
    }
  }

  private handleApiSuccess() {
    if (!this.isApiAvailable()) {
      this.toastService.show('Alerts Restored', 'Real-time alerts have been reconnected.', 'success', 'wifi');
    }
    this.isApiAvailable.set(true);
    this.consecutiveFailures = 0;
    this.currentPollingDelay = 60000;
  }

  private handleApiFailure() {
    this.consecutiveFailures++;
    if (this.consecutiveFailures >= 3 && this.isApiAvailable()) {
      this.isApiAvailable.set(false);
      this.toastService.show('Alerts Unavailable', 'We are having trouble connecting to the alerts service. Data may be stale.', 'error', 'wifi-off');
    }
    // Exponential backoff up to 5 minutes
    this.currentPollingDelay = Math.min(this.currentPollingDelay * 2, 300000);
  }

  private isUserAuthenticated(): boolean {
    if (typeof window === 'undefined') return false;
    const token = localStorage.getItem(environment.tokenKey);
    return !!token;
  }
}
