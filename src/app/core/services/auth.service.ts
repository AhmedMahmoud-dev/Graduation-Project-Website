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
import { AdminService } from './admin.service';

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
  private adminService = inject(AdminService);

  private isBrowser = isPlatformBrowser(this.platformId);

  // Current user signal for reactive UI
  currentUser = signal<AuthUser | null>(this.getCurrentUser());

  // Centeralized role check
  isAdmin = computed(() => this.currentUser()?.roles?.includes('ADMIN') || false);

  // Tracks if the user has successfully requested a reset code
  resetEmailInitiated = signal<string | null>(null);

  constructor() {
    if (this.isBrowser) {
      // Subscribe to remote force logout events from SignalR
      this.alertsService.forceLogout$.subscribe(() => {
        this.logout();
      });

      const user = this.getCurrentUser();
      if (!user || !this.isAuthenticated()) {
        this.clearAllAuth();
      } else {
        this.currentUser.set(user);

        // Professional Logic: Only trigger normal website APIs if NOT an admin
        if (!this.isAdmin()) {
          if (user.token) {
            this.alertsService.fetchStats();
            this.alertsService.fetchSettings();
            this.alertsService.initSignalR(user.token);
          }
        } else {
          // Admins only need SignalR (if needed) but NO user-specific alert APIs
          if (user.token) {
            this.alertsService.initSignalR(user.token);
          }
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
          const user = res.data;
          const isAdmin = user.roles?.includes('ADMIN');

          this.saveAuth(user);

          // Professional Logic: Gate normal website APIs
          if (!isAdmin) {
            this.colorSettingsService.syncWithBackend();
            this.prefetchHistoryMeta();
            this.alertsService.fetchStats();
            this.alertsService.fetchSettings();

            // Alerts Page Background Prefetch
            this.alertService.getAlerts(1, 50).subscribe(r => {
              if (r.is_success && r.data) localStorage.setItem('emotra_alerts_meta', JSON.stringify(r.data.items));
            });
            this.alertService.getStats().subscribe(r => {
              if (r.is_success && r.data) localStorage.setItem('emotra_alerts_stats', JSON.stringify(r.data));
            });
          } else {
            // Admin Logic: Prefetch all management data for instant dashboard loading
            this.prefetchAdminData();
          }

          // Both need SignalR
          this.alertsService.initSignalR(user.token);
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
      this.clearAllAuth();
      this.alertsService.stopSignalR();
      this.router.navigate(['/auth/login']);
    }
  }

  /**
   * Clears all auth-related and cache storage keys for both admin and user
   */
  private clearAllAuth(): void {
    if (!this.isBrowser) return;

    // Core keys that MUST be removed
    const coreKeys = [
      environment.tokenKey,
      environment.userKey,
      'emotra_admin_token',
      'emotra_admin_user',
      'emotra_alert_settings',
      'emotra_alerts_meta',
      'emotra_alerts_stats',
      'emotra_admin_stats',
      'emotra_admin_users',
      'emotra_admin_testimonials',
      'emotra_admin_bugs',
      'emotra_admin_health',
      'emotra_notification_settings'
    ];

    coreKeys.forEach(k => localStorage.removeItem(k));

    // Dynamic cleanup: Wipe ALL Emotra-related cache keys
    // Keep only device/platform preferences
    const retainKeys = [
      'emotra_sidebar_expanded',
      'emotra_theme',
      'emotra_public_testimonials'
    ];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('emotra_') && !retainKeys.includes(key)) {
        localStorage.removeItem(key);
        i--; // Adjust index after removal
      }
    }

    // Clear Session Storage
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key && key.startsWith('emotra_')) {
        sessionStorage.removeItem(key);
        i--;
      }
    }

    this.currentUser.set(null);
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
        this.clearAllAuth();
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
    if (!this.isBrowser) return null;

    // Try Admin key first, then normal User key
    const adminData = localStorage.getItem('emotra_admin_user');
    const userData = localStorage.getItem(environment.userKey);
    const raw = adminData || userData;

    if (raw) {
      try {
        return JSON.parse(raw);
      } catch (e) {
        return null;
      }
    }
    return null;
  }

  /**
   * Save auth data to storage with role-based prefixing
   */
  private saveAuth(user: AuthUser): void {
    if (!this.isBrowser) return;

    const isAdmin = user.roles?.includes('ADMIN');
    const tokenKey = isAdmin ? 'emotra_admin_token' : environment.tokenKey;
    const userKey = isAdmin ? 'emotra_admin_user' : environment.userKey;

    localStorage.setItem(tokenKey, user.token);
    localStorage.setItem(userKey, JSON.stringify(user));
    this.currentUser.set(user);
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
   * Prefetches all administrative data to ensure zero-latency dashboard navigation
   */
  private prefetchAdminData(): void {
    if (!this.isBrowser) return;

    // 1. Stats (Dashboard)
    this.adminService.getStats().subscribe(r => {
      if (r.is_success && r.data) localStorage.setItem('emotra_admin_stats', JSON.stringify(r.data));
    });

    // 2. Users (Management - First page)
    this.adminService.getUsers(1, 10).subscribe(r => {
      if (r.is_success && r.data) {
        localStorage.setItem('emotra_admin_users', JSON.stringify({
          users: r.data,
          total: r.total,
          page: 1
        }));
      }
    });

    // 3. Testimonials (Moderation)
    this.adminService.getPendingTestimonials(1, 50).subscribe(r => {
      if (r.is_success && r.data) localStorage.setItem('emotra_admin_testimonials', JSON.stringify(r.data));
    });

    // 4. Bugs (System Reports)
    this.adminService.getBugReports(1, 10).subscribe(r => {
      if (r.is_success && r.data) {
        localStorage.setItem('emotra_admin_bugs', JSON.stringify({
          bugs: r.data.map(b => ({ ...b, parsedMetadata: null })),
          total: r.total,
          page: 1
        }));
      }
    });

    // 5. Health (Infrastructure Monitor)
    this.adminService.getHealth().subscribe(r => {
      if (r.is_success && r.data) localStorage.setItem('emotra_admin_health', JSON.stringify(r.data));
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
