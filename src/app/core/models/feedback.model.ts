import { ApiResponse } from './api-response.model';

export type FeedbackType = 'analysis' | 'system';

/**
 * Request to submit feedback for a specific analysis results.
 */
export interface AnalysisFeedbackRequest {
  analysis_id: string; // The client_id (UUID) of the analysis
  rating: number; // 1 to 5
  comment?: string; // Optional review text
}

/**
 * Data returned after creating or fetching specific analysis feedback.
 */
export interface AnalysisFeedbackResponse {
  id: number;
  analysis_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
}

/**
 * Request to submit or update platform-wide system feedback.
 */
export interface SystemFeedbackRequest {
  rating: number; // 1 to 5
  comment: string;
  is_public: boolean; // Permission to show on landing page
}

/**
 * Data returned after submitting system feedback.
 */
export interface SystemFeedbackResponse {
  id: number;
  rating: number;
  comment: string;
  is_public: boolean;
  created_at: string;
}

/**
 * Individual testimonial item for the public landing page.
 */
export interface TestimonialItem {
  user_name: string;
  rating: number;
  comment: string;
  created_at: string;
}

/**
 * Statistics for system feedback testimonials.
 */
export interface TestimonialsStats {
  average_rating: number;
  total_reviews: number;
}

/**
 * Complete data structure for the public testimonials endpoint.
 */
export interface TestimonialsData {
  stats: TestimonialsStats;
  items: TestimonialItem[];
}

/**
 * Paginated response for public testimonials.
 */
export interface TestimonialsResponse extends ApiResponse<TestimonialsData> {
  total: number;
  page: number;
  page_size: number;
}

/**
 * Unified feedback item representing either analysis or system feedback.
 */
export interface UnifiedFeedbackItem {
  id: number;
  feedback_type: FeedbackType;
  analysis_id: string | null; // Only present if type is 'analysis'
  rating: number;
  comment: string | null;
  is_public: boolean | null; // Only present if type is 'system'
  created_at: string;
}

/**
 * Paginated unified feedback history response.
 */
export interface UnifiedFeedbackHistoryResponse extends ApiResponse<UnifiedFeedbackItem[]> {
  total: number;
  page: number;
  page_size: number;
}
