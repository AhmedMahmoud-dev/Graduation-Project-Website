import { ApiResponse } from './api-response.model';

export interface PaginatedAdminResponse<T> extends ApiResponse<T> {
  page: number;
  page_size: number;
  total: number;
}

export interface PlatformStats {
  total_users: number;
  active_users: number;
  total_analyses: number;
  total_bug_reports: number;
  analysis_trend: Array<{ date: string; count: number }>;
  new_users_trend: Array<{ date: string; count: number }>;
  emotion_distribution: Record<string, number>;
  analyses_by_type: Record<string, number>;
  bug_reports_by_status: { open: number; in_progress: number; fixed: number; closed: number };
  pending_testimonials: number;
  banned_users: number;
  total_feedback: number;
  average_system_rating: number;
  new_users_last30_days: number;
  total_analyses_last30_days: number;
  most_common_emotion: string;
  analyses_by_type_trend: Array<{ date: string; text_count: number; audio_count: number }>;
  top_active_users: Array<{ user_id: string; full_name: string; email: string; analysis_count: number }>;
  system_feedback_count: number;
}

export interface AdminUser {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  is_active: boolean;
  created_at: string;
  total_analyses: number;
}

export interface BugMetadata {
  viewport: string;
  browser: string;
  url: string;
  timestamp: string;
}

export interface AdminBugReport {
  id: number;
  title: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  created_at: string;
  submitted_by: string;
  user_email: string;
  metadata?: string;
  parsedMetadata?: BugMetadata | null;
}

export interface AdminTestimonial {
  id: number;
  user_id?: string;
  user_name?: string;
  user_email?: string;
  rating: number;
  comment: string;
  created_at: string;
  moderation_status?: string;
}

export interface ServiceHealth {
  service_name: string;
  status: string;
  response_time_ms: number;
  last_checked_at: string;
}
