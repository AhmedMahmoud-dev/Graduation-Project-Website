import { Injectable, signal, inject, PLATFORM_ID, computed } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, tap, map } from 'rxjs/operators';
import { Router } from '@angular/router';
import { isPlatformBrowser } from '@angular/common';
import { environment } from '../../../environments/environment';
import { ApiResponse, AuthUser } from '../models/api-response.model';
import { AnalysisHistoryResponse } from '../models/analysis-v2.model';
import { ErrorHandlerService } from './error-handler.service';
import { ColorSettingsService } from './color-settings.service';
import { AlertsService } from './alerts.service';
import { AlertService } from './alert.service';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private platformId = inject(PLATFORM_ID);
  private errorHandler = inject(ErrorHandlerService);
  private colorSettingsService = inject(ColorSettingsService);
  private alertsService = inject(AlertsService);
  private alertService = inject(AlertService);

  private isBrowser = isPlatformBrowser(this.platformId);

  // Current user signal for reactive UI
  currentUser = signal<AuthUser | null>(this.getCurrentUser());

  // Centeralized role check
  isAdmin = computed(() => this.currentUser()?.roles?.includes('ADMIN') || false);

  // Tracks if the user has successfully requested a reset code
  resetEmailInitiated = signal<string | null>(null);

  constructor() {
    if (this.isBrowser) {
      if (!this.isAuthenticated()) {
        // If storage has data but it's invalid/expired, clean it up
        localStorage.removeItem(environment.tokenKey);
        localStorage.removeItem(environment.userKey);
        this.currentUser.set(null);
      } else {
        this.currentUser.set(this.getCurrentUser());

        // Setup alerts for returning users
        const user = this.getCurrentUser();
        if (user && user.token) {
          this.alertsService.fetchStats();
          this.alertsService.fetchSettings();
          this.alertsService.initSignalR(user.token);
        }
      }
    }
  }

  /**
   * Login user
   * POST /api/auth/login
   */
  login(email: string, password: string): Observable<ApiResponse<AuthUser>> {
    const url = `${environment.apiUrl}/api/auth/login`;
    const payload = { email, password };

    return this.http.post<ApiResponse<AuthUser>>(url, payload).pipe(
      tap(res => {
        if (res.is_success && res.data) {
          this.saveAuth(res.data);
          this.colorSettingsService.syncWithBackend();
          this.prefetchHistoryMeta();

          this.alertsService.fetchStats();
          this.alertsService.fetchSettings();
          this.alertsService.initSignalR(res.data.token);

          // Alerts Page Background Prefetch
          this.alertService.getAlerts(1, 50).subscribe(r => {
            if (r.is_success && r.data) localStorage.setItem('emotra_alerts_meta', JSON.stringify(r.data.items));
          });
          this.alertService.getStats().subscribe(r => {
            if (r.is_success && r.data) localStorage.setItem('emotra_alerts_stats', JSON.stringify(r.data));
          });
        }
      }),
      catchError(err => this.handleHttpError(err))
    );
  }

  /**
   * Register new user
   * POST /api/auth/register
   */
  register(email: string, password: string, first_name: string, last_name: string): Observable<ApiResponse<null>> {
    const url = `${environment.apiUrl}/api/auth/register`;
    const payload = { email, password, first_name, last_name };

    return this.http.post<ApiResponse<null>>(url, payload).pipe(
      catchError(err => this.handleHttpError(err))
    );
  }

  /**
   * Request reset code
   */
  forgotPassword(email: string): Observable<ApiResponse<null>> {
    const url = `${environment.apiUrl}/api/auth/forgot-password`;
    return this.http.post<ApiResponse<null>>(url, { email }).pipe(
      tap(res => {
        if (res.is_success) {
          this.resetEmailInitiated.set(email);
        }
      }),
      catchError(err => this.handleHttpError(err))
    );
  }

  /**
   * Reset password with code
   */
  resetPassword(email: string, token: string, new_password: string): Observable<ApiResponse<null>> {
    const url = `${environment.apiUrl}/api/auth/reset-password`;
    return this.http.post<ApiResponse<null>>(url, { email, token, new_password }).pipe(
      tap(res => {
        if (res.is_success) {
          this.resetEmailInitiated.set(null);
        }
      }),
      catchError(err => this.handleHttpError(err))
    );
  }

  /**
   * Logout and clear state
   */
  logout(): void {
    if (this.isBrowser) {
      // Remove core auth tokens
      localStorage.removeItem(environment.tokenKey);
      localStorage.removeItem(environment.userKey);
      localStorage.removeItem('emotra_alert_settings');
      localStorage.removeItem('emotra_alerts_meta');
      localStorage.removeItem('emotra_alerts_stats');
      localStorage.removeItem('emotra_notification_settings');

      this.alertsService.stopSignalR();

      // Wipe ALL Emotra-related cache keys, except device preferences and public content
      const retainKeys = ['emotra_sidebar_expanded', 'emotra_theme', 'emotra_public_testimonials'];

      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('emotra_') && !retainKeys.includes(key)) {
          localStorage.removeItem(key);
          i--; // Adjust index after removal
        }
      }

      // 3. Clear Session Storage (all emotra_ keys)
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key && key.startsWith('emotra_')) {
          sessionStorage.removeItem(key);
          i--;
        }
      }

      this.currentUser.set(null);
      this.router.navigate(['/']);
    }
  }

  /**
   * Checks if user is authenticated (token exists + not expired)
   */
  isAuthenticated(): boolean {
    if (!this.isBrowser) return false;

    const user = this.currentUser();

    if (!user || !user.token || !user.expires_at) return false;

    try {
      const expiry = new Date(user.expires_at);
      if (expiry <= new Date()) {
        // Token expired naturally while browsing
        localStorage.removeItem(environment.tokenKey);
        localStorage.removeItem(environment.userKey);
        this.currentUser.set(null);
        return false;
      }
      return true;
    } catch (e) {
      return false;
    }
  }

  /**
   * Get current user from storage
   */
  getCurrentUser(): AuthUser | null {
    if (this.isBrowser) {
      const userData = localStorage.getItem(environment.userKey);
      if (userData) {
        try {
          return JSON.parse(userData);
        } catch (e) {
          return null;
        }
      }
    }
    return null;
  }

  /**
   * Save auth data to storage
   */
  private saveAuth(user: AuthUser): void {
    if (this.isBrowser) {
      localStorage.setItem(environment.tokenKey, user.token);
      localStorage.setItem(environment.userKey, JSON.stringify(user));
      this.currentUser.set(user);
    }
  }

  /**
   * Fire-and-forget: pre-populate history meta cache for compare page.
   * Runs immediately after login so the compare selector has data on first visit.
   */
  private prefetchHistoryMeta(): void {
    const baseUrl = `${environment.apiUrl}/api/analysis/history?page=1&limit=50`;

    this.http.get<AnalysisHistoryResponse>(`${baseUrl}&type=Text`).subscribe({
      next: (res) => {
        if (res.is_success && res.data) {
          try { localStorage.setItem('emotra_history_meta_text', JSON.stringify({ data: res.data, total: res.total })); } catch (e) { }
        }
      },
      error: () => { }
    });

    this.http.get<AnalysisHistoryResponse>(`${baseUrl}&type=Audio`).subscribe({
      next: (res) => {
        if (res.is_success && res.data) {
          try { localStorage.setItem('emotra_history_meta_audio', JSON.stringify({ data: res.data, total: res.total })); } catch (e) { }
        }
      },
      error: () => { }
    });
  }

  /**
   * Centralized error handler for this service
   */
  private handleHttpError(error: any): Observable<never> {
    // If it's already an error object we threw in map()
    if (error.message && !error.status) {
      return throwError(() => error);
    }

    // Otherwise it's a real HttpErrorResponse
    const handledMessage = this.errorHandler.handleError(error);

    // Check for .NET validation errors
    if (error.status === 400 && error.error?.errors) {
      return throwError(() => ({
        message: error.error.message || handledMessage,
        validationErrors: error.error.errors // Record<string, string[]>
      }));
    }

    return throwError(() => ({ message: handledMessage }));
  }
}
