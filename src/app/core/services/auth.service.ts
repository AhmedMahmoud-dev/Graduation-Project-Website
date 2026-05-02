import { Injectable, signal, inject, PLATFORM_ID, computed } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, of } from 'rxjs';
import { catchError, tap, map } from 'rxjs/operators';
import { Router } from '@angular/router';
import { isPlatformBrowser } from '@angular/common';
import { environment } from '../../../environments/environment';
import { ApiResponse, AuthUser, BanDetails } from '../models/api-response.model';
import { AnalysisHistoryResponse } from '../models/analysis-v2.model';
import { ErrorHandlerService } from './error-handler.service';
import { ColorSettingsService } from './color-settings.service';
import { AlertsService } from './alerts.service';
import { AlertService } from './alert.service';
import { AdminService } from './admin.service';
import { AdminSupportService } from './admin-support.service';

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
  private adminSupportService = inject(AdminSupportService);

  private isBrowser = isPlatformBrowser(this.platformId);

  // Current user signal for reactive UI
  currentUser = signal<AuthUser | null>(this.getCurrentUser());

  // Centeralized role check
  isAdmin = computed(() => this.currentUser()?.roles?.includes('ADMIN') || false);

  // Tracks if the user has successfully requested a reset code
  resetEmailInitiated = signal<string | null>(null);

  isAppInitialized = signal(false);

  constructor() {
    if (this.isBrowser) {
      // Subscribe to remote force logout events from SignalR
      this.alertsService.forceLogout$.subscribe((banDetails) => {
        if (banDetails && banDetails.ban_reason) {
          this.storeBanDetails(banDetails);
        }
        this.logout(true);
      });

      const user = this.getCurrentUser();
      if (!user || !this.isAuthenticated()) {
        this.clearAllAuth();
      } else {
        this.currentUser.set(user);
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

          // Check if user is banned
          if (user.ban_reason) {
            this.storeBanDetails({
              ban_reason: user.ban_reason,
              ban_expires_at: user.ban_expires_at,
              is_permanent: !!user.is_permanent
            });
            // Treat as failed login - do NOT save auth or continue
            return;
          }

          const isAdmin = user.roles?.includes('ADMIN');

          this.saveAuth(user);

          // Always sync appearance settings for both roles
          this.colorSettingsService.syncWithBackend();

          if (!isAdmin) {
            this.prefetchHistoryMeta();
            this.alertsService.fetchStats();
            this.alertsService.fetchSettings();

            // Alerts Page Background Prefetch (Matches AlertsComponent pageSize: 10)
            this.alertService.getAlerts(1, 10).subscribe(r => {
              if (r.is_success && r.data) {
                localStorage.setItem('emotra_alerts_meta', JSON.stringify({
                  data: r.data.items,
                  total: r.data.total_count
                }));
              }
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
  logout(isForced: boolean = false): void {
    if (this.isBrowser) {
      this.clearAllAuth();
      this.alertsService.stopSignalR();
      if (!isForced) {
        this.clearBanDetails(); // Clear existing ban notices only on intentional logout
      }
      this.router.navigate(['/auth/login']);
    }
  }

  /**
   * Saves ban details to sessionStorage as JSON
   */
  storeBanDetails(details: BanDetails): void {
    if (!this.isBrowser) return;
    sessionStorage.setItem('emotra_ban_details', JSON.stringify(details));
  }

  /**
   * Reads and parses ban details from sessionStorage
   */
  getBanDetails(): BanDetails | null {
    if (!this.isBrowser) return null;
    const details = sessionStorage.getItem('emotra_ban_details');
    if (!details) return null;
    try {
      return JSON.parse(details) as BanDetails;
    } catch (e) {
      return null;
    }
  }

  /**
   * Removes ban details from sessionStorage
   */
  clearBanDetails(): void {
    if (!this.isBrowser) return;
    sessionStorage.removeItem('emotra_ban_details');
  }

  /**
   * Clears all auth-related and cache storage keys for both admin and user
   */
  public clearAllAuth(): void {
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
      if (key && key.startsWith('emotra_') && key !== 'emotra_ban_details') {
        sessionStorage.removeItem(key);
        i--;
      }
    }

    this.currentUser.set(null);
  }

  /**
   * Checks session validity with the server on startup.
   * If banned, the interceptor will catch the 403 and trigger logout/notice.
   */
  verifySessionWithServer(): Observable<any> {
    if (!this.isBrowser || !this.isAuthenticated()) {
      return of(null);
    }

    const isAdmin = this.isAdmin();
    const url = isAdmin
      ? `${environment.apiUrl}/api/admin/health`
      : `${environment.apiUrl}/api/alerts/stats`;

    return this.http.get(url).pipe(
      tap(() => {
        this.isAppInitialized.set(true);
        const user = this.getCurrentUser();
        if (user?.token) {
          if (!this.isAdmin()) {
            this.alertsService.fetchStats();
            this.alertsService.fetchSettings();
          }
          this.alertsService.initSignalR(user.token);
        }
      }),
      catchError((error) => {
        // If the backend ban middleware short-circuits before CORS, the browser
        // blocks the response and Angular sees status === 0.
        // We must treat status 0 (when online) as a potential ban to prevent access.
        if (error?.status === 0) {
          if (this.isBrowser && navigator.onLine) {
            this.clearAllAuth();
            window.location.href = '/auth/login';
            return new Observable(); // Halt bootstrap
          }
          // If genuinely offline, we might allow optimistic load, but usually, we just stop.
          this.isAppInitialized.set(true);
          return of(null);
        }
        if (error?.status === 401 || error?.status === 403) {
          if (error.status === 403 && error.error?.data?.ban_reason) {
            this.storeBanDetails(error.error.data);
          }
          this.clearAllAuth();
          if (this.isBrowser) {
            window.location.href = '/auth/login';
            return new Observable();
          }
        }
        return of(null);
      })
    );
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

    // 6. Support (Queue)
    this.adminSupportService.getMessages(1, 100).subscribe(r => {
      if (r.is_success && r.data) {
        const data = r.data;
        const items = Array.isArray(data) ? data : (data.items || []);
        localStorage.setItem('emotra_admin_support', JSON.stringify(items));
      }
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
        validationErrors: error.error.errors,
        status: error.status
      }));
    }

    // Return the full error info for ban handling in components
    return throwError(() => ({
      message: handledMessage,
      status: error.status,
      error: error.error // Include raw body for data.ban_reason
    }));
  }
}
