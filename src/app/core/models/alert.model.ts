export interface AlertItem {
  id: number;
  user_id: string;
  analysis_id: number | null;
  client_id: string | null;
  message: string;
  type: string; // possible values: "emotion_spike", "support_reply"
  severity: string; // low, medium, high, critical
  triggered_at: string;
  resolved: boolean;
  resolved_at: string | null;
  recommended_action: string;
}

export interface AlertStats {
  total_alerts: number;
  unread_alerts: number;
  critical_alerts: number;
  high_alerts: number;
}

export interface AlertsPagedResult {
  items: AlertItem[];
  page: number;
  page_size: number;
  total_count: number;
}
