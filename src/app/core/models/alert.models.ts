export interface AlertStats {
  total_alerts: number;
  unread_alerts: number;
  critical_alerts: number;
  high_alerts: number;
}

export interface AlertSettings {
  alerts_enabled: boolean;
  alert_negative_threshold: number;
  alert_consecutive_count: number;
  alert_severity_level: string;
  push_notifications: boolean;
  email_notifications: boolean;
}
