import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, catchError, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/api-response.model';
import {
  AnalysisFeedbackRequest,
  AnalysisFeedbackResponse,
  SystemFeedbackRequest,
  SystemFeedbackResponse,
  TestimonialsResponse,
  UnifiedFeedbackHistoryResponse
} from '../models/feedback.model';

@Injectable({
  providedIn: 'root'
})
export class FeedbackService {
  private http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  private readonly FEEDBACK_STORAGE_KEY = 'emotra_feedback';
  private readonly SYSTEM_FEEDBACK_STORAGE_KEY = 'emotra_system_feedback';

  // ==========================================
  // 0. Caching Logic
  // ==========================================

  getCachedAnalysisFeedback(analysisId: string): any | null {
    try {
      const raw = localStorage.getItem(this.FEEDBACK_STORAGE_KEY);
      if (!raw) return null;
      const dict = JSON.parse(raw);
      return dict[analysisId] || null;
    } catch (e) {
      return null;
    }
  }

  cacheAnalysisFeedback(feedback: any): void {
    if (!feedback || !feedback.analysis_id) return;
    try {
      const raw = localStorage.getItem(this.FEEDBACK_STORAGE_KEY);
      const dict = raw ? JSON.parse(raw) : {};
      dict[feedback.analysis_id] = feedback;
      localStorage.setItem(this.FEEDBACK_STORAGE_KEY, JSON.stringify(dict));
    } catch (e) {
      console.error('Failed to cache analysis feedback:', e);
    }
  }

  removeCachedAnalysisFeedback(analysisId: string): void {
    try {
      const raw = localStorage.getItem(this.FEEDBACK_STORAGE_KEY);
      if (!raw) return;
      const dict = JSON.parse(raw);
      delete dict[analysisId];
      localStorage.setItem(this.FEEDBACK_STORAGE_KEY, JSON.stringify(dict));
    } catch (e) {
      console.error('Failed to remove cached feedback:', e);
    }
  }

  getCachedSystemFeedback(): any | null {
    try {
      const raw = localStorage.getItem(this.SYSTEM_FEEDBACK_STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  cacheSystemFeedback(feedback: any): void {
    try {
      localStorage.setItem(this.SYSTEM_FEEDBACK_STORAGE_KEY, JSON.stringify(feedback));
    } catch (e) {
      console.error('Failed to cache system feedback:', e);
    }
  }

  removeCachedSystemFeedback(): void {
    localStorage.removeItem(this.SYSTEM_FEEDBACK_STORAGE_KEY);
  }

  // ==========================================
  // 1. Analysis Feedback Endpoints
  // ==========================================

  /**
   * Submits a rating and comment for a specific analysis result.
   */
  submitAnalysisFeedback(request: AnalysisFeedbackRequest): Observable<ApiResponse<AnalysisFeedbackResponse>> {
    const url = `${this.baseUrl}/api/feedback`;
    return this.http.post<ApiResponse<AnalysisFeedbackResponse>>(url, request);
  }

  /**
   * Retrieves the feedback provided for a specific analysis.
   * Uses the client_id (UUID) for lookup.
   */
  getAnalysisFeedback(analysisId: string): Observable<ApiResponse<AnalysisFeedbackResponse>> {
    const url = `${this.baseUrl}/api/feedback/${analysisId}`;
    return this.http.get<ApiResponse<AnalysisFeedbackResponse>>(url).pipe(
      catchError(err => {
        if (err.status === 404) {
          return of({ is_success: true, data: null, message: 'No feedback found' } as any);
        }
        throw err;
      })
    );
  }

  /**
   * Deletes a feedback entry by its associated analysis ID (client_id).
   */
  deleteFeedback(analysisId: string): Observable<ApiResponse<boolean>> {
    const url = `${this.baseUrl}/api/feedback/${analysisId}`;
    return this.http.delete<ApiResponse<boolean>>(url);
  }

  // ==========================================
  // 2. System Feedback (Testimonials) Endpoints
  // ==========================================

  /**
   * Submits or updates a platform-wide testimonial.
   * This is an "Upsert" operation on the backend.
   */
  submitSystemFeedback(request: SystemFeedbackRequest): Observable<ApiResponse<SystemFeedbackResponse>> {
    const url = `${this.baseUrl}/api/system-feedback`;
    return this.http.post<ApiResponse<SystemFeedbackResponse>>(url, request);
  }

  /**
   * Fetches public testimonials for the landing page.
   * This endpoint is anonymous (no token required).
   */
  getPublicTestimonials(page: number = 1, limit: number = 10): Observable<TestimonialsResponse> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());

    const url = `${this.baseUrl}/api/system-feedback/testimonials`;
    return this.http.get<TestimonialsResponse>(url, { params });
  }

  /**
   * Retrieves the unified history of ALL feedback submitted by the current user.
   * Includes both Analysis and System feedback with pagination.
   */
  getMyFeedbackHistory(page: number = 1, limit: number = 10): Observable<UnifiedFeedbackHistoryResponse> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());

    const url = `${this.baseUrl}/api/system-feedback/me`;
    return this.http.get<UnifiedFeedbackHistoryResponse>(url, { params });
  }
}
