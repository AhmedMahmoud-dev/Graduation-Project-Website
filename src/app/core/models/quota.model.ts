export interface QuotaUsageDetail {
  used: number;
  limit: number;
  remaining: number;
  used_percentage: number;
  is_blocked: boolean;
}

export interface QuotaUsageDoubleDetail {
  used: number;
  limit: number;
  remaining: number;
  used_percentage: number;
  is_blocked: boolean;
}

export interface UserQuotaStatus {
  week_start_date: string;
  reset_date: string;
  text: QuotaUsageDetail;
  audio: QuotaUsageDoubleDetail;
  video: QuotaUsageDoubleDetail;
  image: QuotaUsageDetail;
}

export interface UpdateUserQuotaLimits {
  text_tokens_limit?: number;
  audio_seconds_limit?: number;
  video_seconds_limit?: number;
  image_count_limit?: number;
}
