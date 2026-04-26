import { ApiResponse } from './api-response.model';
import { TextAnalysisResult } from './text-analysis.model';
import { AudioAnalysisResponse } from './audio-analysis.model';

export type AnalysisType = 'Text' | 'Audio';

export interface AnalysisRecentActivity {
  id: number;
  client_id: string;
  type: string;
  timestamp: string;
  label: string;
  confidence: number;
  snippet: string;
}

export interface AnalysisActivityTrend {
  timestamp: string;
  confidence: number;
}

export interface EmotionDistribution {
  labels: Record<string, number>;
  categories: {
    Positive?: number;
    neutral?: number;
    Negative?: number;
  };
}

export interface UsageMetrics {
  total_analyses: number;
  text_count: number;
  audio_count: number;
  total_tokens: number;
  total_audio_duration_seconds: number;
  avg_confidence: number;
}

export interface AnalysisStats {
  usage_metrics: UsageMetrics;
  emotion_distribution: EmotionDistribution;
  most_frequent: {
    label: string;
    count: number;
  };
  recent_activity: AnalysisRecentActivity[];
  activity_trend: AnalysisActivityTrend[];
}

export interface AnalysisHistoryItem {
  id: number;
  client_id: string;
  type: AnalysisType;
  dominant_emotion: string;
  emotion_category: string;
  confidence: number;
  confidence_percent: number;
  summary_text: string;
  timestamp: string;
}

/**
 * Specialized response type for paginated Analysis History.
 * The backend provides total/page/page_size at the root level.
 */
export interface AnalysisHistoryResponse extends ApiResponse<AnalysisHistoryItem[]> {
  total: number;
  page: number;
  page_size: number;
}

export interface SaveTextAnalysisRequest {
  client_id: string;
  result: TextAnalysisResult;
}

export interface SaveAudioAnalysisRequest {
  client_id: string;
  result: AudioAnalysisResponse;
}

export interface AnalysisDetails {
  id: number;
  client_id: string;
  type: AnalysisType;
  timestamp: string;
  note: string | null;
  result: TextAnalysisResult | AudioAnalysisResponse;
}
