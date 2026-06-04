import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, catchError, of, tap } from 'rxjs';
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

  private currentSystemFeedbackCache: ApiResponse<SystemFeedbackResponse | null> | null = null;

  // ==========================================
  // 0. Caching Logic
  // ==========================================

  getCachedAnalysisFeedback(analysisId: string): AnalysisFeedbackResponse | null {
    try {
      const raw = localStorage.getItem(this.FEEDBACK_STORAGE_KEY);
      if (!raw) return null;
      const dict = JSON.parse(raw);
      return dict[analysisId] || null;
    } catch (e) {
      return null;
    }
  }

  cacheAnalysisFeedback(feedback: AnalysisFeedbackResponse): void {
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

  getCachedSystemFeedback(): SystemFeedbackResponse | null {
    try {
      const raw = localStorage.getItem(this.SYSTEM_FEEDBACK_STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  cacheSystemFeedback(feedback: SystemFeedbackResponse): void {
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
    return this.http.post<ApiResponse<SystemFeedbackResponse>>(url, request).pipe(
      tap(res => {
        if (res.is_success && res.data) {
          this.currentSystemFeedbackCache = {
            is_success: true,
            data: res.data,
            message: res.message || '',
            status_code: res.status_code,
            errors: res.errors || null,
            timestamp: res.timestamp
          };
        }
      })
    );
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
   * Retrieves the current user's system feedback (testimonial) if one exists.
   * Handles 404 cleanly by returning null.
   */
  getCurrentSystemFeedback(forceRefresh = false): Observable<ApiResponse<SystemFeedbackResponse | null>> {
    if (!forceRefresh && this.currentSystemFeedbackCache) {
      return of(this.currentSystemFeedbackCache);
    }
    const url = `${this.baseUrl}/api/system-feedback/current`;
    return this.http.get<ApiResponse<SystemFeedbackResponse | null>>(url).pipe(
      tap(res => {
        if (res.is_success) {
          this.currentSystemFeedbackCache = res;
        }
      }),
      catchError(err => {
        if (err.status === 404) {
          const res = { is_success: true, data: null, message: 'No system feedback found' } as any;
          this.currentSystemFeedbackCache = res;
          return of(res);
        }
        throw err;
      })
    );
  }

  clearSystemFeedbackCache(): void {
    this.currentSystemFeedbackCache = null;
    this.removeCachedSystemFeedback();
  }

  getMyFeedbackHistory(
    page: number = 1,
    pageSize: number = 10,
    search?: string,
    sortOrder?: string
  ): Observable<UnifiedFeedbackHistoryResponse> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('pageSize', pageSize.toString());

    if (search) {
      params = params.set('search', search);
    }
    if (sortOrder) {
      const order = sortOrder === 'oldest' ? 'asc' : 'desc';
      params = params.set('sortOrder', order);
    }

    const url = `${this.baseUrl}/api/system-feedback/me`;
    return this.http.get<UnifiedFeedbackHistoryResponse>(url, { params });
  }
}
