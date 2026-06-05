import { Injectable, signal, inject, PLATFORM_ID, computed } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, of, Subject } from 'rxjs';
import { catchError, tap, map, takeUntil } from 'rxjs/operators';
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
import { QuotaStore } from '../stores/quota.store';
import { AppCacheService } from './app-cache.service';
import { FeedbackService } from './feedback.service';
import { ToastService } from './toast.service';

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
  private quotaStore = inject(QuotaStore);
  private appCache = inject(AppCacheService);
  private feedbackService = inject(FeedbackService);
  private toastService = inject(ToastService);

  private isBrowser = isPlatformBrowser(this.platformId);

  // Current user signal for reactive UI
  currentUser = signal<AuthUser | null>(this.getCurrentUser());

  // Centeralized role check
  isAdmin = computed(() => this.currentUser()?.roles?.includes('ADMIN') || false);

  // Tracks if the user has successfully requested a reset code
  resetEmailInitiated = signal<string | null>(null);

  isAppInitialized = signal(false);
  private isUnloading = false;

  private logout$ = new Subject<void>();

  constructor() {
    if (this.isBrowser) {
      // Subscribe to remote force logout events from SignalR
      this.alertsService.forceLogout$.subscribe((payload: any) => {
        if (payload?.reason === 'account_deleted') {
          // Flag already set in alerts.service.ts
          this.logout(true);
          return;
        }

        const banDetails = payload;
        if (banDetails && banDetails.ban_reason) {
          this.storeBanDetails(banDetails);
        }
        this.logout(true);
      });

      // Track window unloading to distinguish between refresh-induced cancellations (status 0)
      // and genuine network/CORS failures (potential bans).
      window.addEventListener('beforeunload', () => {
        this.isUnloading = true;
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
            this.quotaStore.loadQuota();

            // Alerts Page Background Prefetch (Matches AlertsComponent pageSize: 10)
            this.alertService.getAlerts(1, 10).pipe(takeUntil(this.logout$)).subscribe({
              next: r => {
                if (!this.isAuthenticated()) return;
                if (r.is_success && r.data) {
                  localStorage.setItem('emotra_alerts_meta', JSON.stringify({
                    data: r.data.items,
                    total: r.data.total_count
                  }));
                }
              },
              error: () => {}
            });
            this.alertService.getStats().pipe(takeUntil(this.logout$)).subscribe({
              next: r => {
                if (!this.isAuthenticated()) return;
                if (r.is_success && r.data) localStorage.setItem('emotra_alerts_stats', JSON.stringify(r.data));
              },
              error: () => {}
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
   * Login user with Google
   * POST /api/auth/google
   */
  loginWithGoogle(idToken: string): Observable<ApiResponse<AuthUser>> {
    const url = `${environment.apiUrl}/api/auth/google`;
    const payload = { id_token: idToken };

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
            return;
          }

          const isAdmin = user.roles?.includes('ADMIN');
          this.saveAuth(user);
          this.colorSettingsService.syncWithBackend();

          if (!isAdmin) {
            this.prefetchHistoryMeta();
            this.alertsService.fetchStats();
            this.alertsService.fetchSettings();
            this.quotaStore.loadQuota();

            // Alerts prefetch using AppCacheService (to avoid raw localStorage calls)
            this.alertService.getAlerts(1, 10).pipe(takeUntil(this.logout$)).subscribe({
              next: r => {
                if (!this.isAuthenticated()) return;
                if (r.is_success && r.data) {
                  this.appCache.setItem('emotra_alerts_meta', {
                    data: r.data.items,
                    total: r.data.total_count
                  });
                }
              }
            });
            this.alertService.getStats().pipe(takeUntil(this.logout$)).subscribe({
              next: r => {
                if (!this.isAuthenticated()) return;
                if (r.is_success && r.data) this.appCache.setItem('emotra_alerts_stats', r.data);
              }
            });
          } else {
            this.prefetchAdminData();
          }

          // Initialize SignalR
          this.alertsService.initSignalR(user.token);
        }
      }),
      catchError(err => this.handleHttpError(err))
    );
  }

  /**
   * Exchange Google authorization code for JWT token
   * POST /api/auth/google/exchange
   */
  exchangeGoogleCode(code: string, redirectUri: string): Observable<ApiResponse<AuthUser>> {
    const url = `${environment.apiUrl}/api/auth/google/exchange`;
    const payload = { code, redirect_uri: redirectUri };

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
            return;
          }

          const isAdmin = user.roles?.includes('ADMIN');
          this.saveAuth(user);
          this.colorSettingsService.syncWithBackend();

          if (!isAdmin) {
            this.prefetchHistoryMeta();
            this.alertsService.fetchStats();
            this.alertsService.fetchSettings();
            this.quotaStore.loadQuota();

            this.alertService.getAlerts(1, 10).pipe(takeUntil(this.logout$)).subscribe({
              next: r => {
                if (!this.isAuthenticated()) return;
                if (r.is_success && r.data) {
                  this.appCache.setItem('emotra_alerts_meta', {
                    data: r.data.items,
                    total: r.data.total_count
                  });
                }
              }
            });
            this.alertService.getStats().pipe(takeUntil(this.logout$)).subscribe({
              next: r => {
                if (!this.isAuthenticated()) return;
                if (r.is_success && r.data) this.appCache.setItem('emotra_alerts_stats', r.data);
              }
            });
          } else {
            this.prefetchAdminData();
          }

          // Initialize SignalR
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
      if (!isForced) {
        // Fire-and-forget server-side cookie deletion
        this.http.post(`${environment.apiUrl}/api/auth/logout`, {}, { withCredentials: true }).subscribe({
          error: (err) => console.error('Logout request failed', err)
        });
      }
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

    this.logout$.next();
    this.quotaStore.clearQuota();
    this.feedbackService.clearSystemFeedbackCache();

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

    const keysToDelete: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('emotra_') && !retainKeys.includes(key)) {
        keysToDelete.push(key);
      }
    }
    keysToDelete.forEach(k => localStorage.removeItem(k));

    // Clear Session Storage
    const sessionKeysToDelete: string[] = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key && key.startsWith('emotra_') && key !== 'emotra_ban_details') {
        sessionKeysToDelete.push(key);
      }
    }
    sessionKeysToDelete.forEach(k => sessionStorage.removeItem(k));

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
        if (user) {
          if (!this.isAdmin()) {
            this.alertsService.fetchStats();
            this.alertsService.fetchSettings();
            this.quotaStore.loadQuota();
          }
          this.alertsService.initSignalR(user.token || '');
        }
      }),
      catchError((error) => {
        // If the backend ban middleware short-circuits before CORS, the browser
        // blocks the response and Angular sees status === 0.
        // We must treat status 0 (when online) as a potential ban to prevent access.
        if (error?.status === 0) {
          if (this.isBrowser && navigator.onLine && !this.isUnloading) {
            this.clearAllAuth();
            window.location.href = '/auth/login';
            return new Observable(); // Halt bootstrap
          }
          // If genuinely offline, or if it's a refresh cancellation, we might allow optimistic load.
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
        
        // Handle Account Deletion
        if (error?.status === 404 && error.error?.code === 'USER_DELETED') {
          this.clearAllAuth();
          if (this.isBrowser) {
            sessionStorage.setItem('emotra_account_deleted', 'true');
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
    if (!user || !user.expires_at) return false;

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
        const user = JSON.parse(raw) as AuthUser;
        const isAdmin = user.roles?.includes('ADMIN');
        const tokenKey = isAdmin ? 'emotra_admin_token' : environment.tokenKey;
        user.token = localStorage.getItem(tokenKey) || '';
        return user;
      } catch (e) {
        return null;
      }
    }
    return null;
  }

  /**
   * Get JWT token for fallback header authorization
   */
  getToken(): string {
    if (!this.isBrowser) return '';
    const user = this.currentUser();
    if (user && user.token) return user.token;

    const adminData = localStorage.getItem('emotra_admin_user');
    const isAdmin = adminData ? true : false;
    const tokenKey = isAdmin ? 'emotra_admin_token' : environment.tokenKey;
    return localStorage.getItem(tokenKey) || '';
  }

  /**
   * Save auth data to storage with role-based prefixing
   */
  private saveAuth(user: AuthUser): void {
    if (!this.isBrowser) return;

    const isAdmin = user.roles?.includes('ADMIN');
    const userKey = isAdmin ? 'emotra_admin_user' : environment.userKey;
    const tokenKey = isAdmin ? 'emotra_admin_token' : environment.tokenKey;

    // Store JWT token locally as a fallback for cross-domain mobile clients where cookies are blocked
    if (user.token) {
      localStorage.setItem(tokenKey, user.token);
    }

    const { token, ...userWithoutToken } = user;
    localStorage.setItem(userKey, JSON.stringify(userWithoutToken));
    
    // Keep user state matching current configuration
    const userState = { ...user };
    this.currentUser.set(userState);
  }

  /**
   * Fire-and-forget: pre-populate history meta cache for compare page.
   * Runs immediately after login so the compare selector has data on first visit.
   */
  private prefetchHistoryMeta(): void {
    const baseUrl = `${environment.apiUrl}/api/analysis/history?page=1&limit=50`;

    this.http.get<AnalysisHistoryResponse>(`${baseUrl}&type=Text`).pipe(takeUntil(this.logout$)).subscribe({
      next: (res) => {
        if (!this.isAuthenticated()) return;
        if (res.is_success && res.data) {
          try { localStorage.setItem('emotra_history_meta_text', JSON.stringify({ data: res.data, total: res.total })); } catch (e) { }
        }
      },
      error: () => { }
    });

    this.http.get<AnalysisHistoryResponse>(`${baseUrl}&type=Audio`).pipe(takeUntil(this.logout$)).subscribe({
      next: (res) => {
        if (!this.isAuthenticated()) return;
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
    this.adminService.getStats().pipe(takeUntil(this.logout$)).subscribe({
      next: r => {
        if (!this.isAuthenticated()) return;
        if (r.is_success && r.data) localStorage.setItem('emotra_admin_stats', JSON.stringify(r.data));
      },
      error: () => {}
    });

    // 2. Users (Management - First page)
    this.adminService.getUsers(1, 10).pipe(takeUntil(this.logout$)).subscribe({
      next: r => {
        if (!this.isAuthenticated()) return;
        if (r.is_success && r.data) {
          localStorage.setItem('emotra_admin_users', JSON.stringify({
            users: r.data,
            total: r.total,
            page: 1
          }));
        }
      },
      error: () => {}
    });

    // 3. Testimonials (Moderation)
    this.adminService.getPendingTestimonials(1, 50).pipe(takeUntil(this.logout$)).subscribe({
      next: r => {
        if (!this.isAuthenticated()) return;
        if (r.is_success && r.data) localStorage.setItem('emotra_admin_testimonials', JSON.stringify(r.data));
      },
      error: () => {}
    });

    // 4. Bugs (System Reports)
    this.adminService.getBugReports(1, 10).pipe(takeUntil(this.logout$)).subscribe({
      next: r => {
        if (!this.isAuthenticated()) return;
        if (r.is_success && r.data) {
          localStorage.setItem('emotra_admin_bugs', JSON.stringify({
            bugs: r.data.map(b => ({ ...b, parsedMetadata: null })),
            total: r.total,
            page: 1
          }));
        }
      },
      error: () => {}
    });

    // 5. Health (Infrastructure Monitor)
    this.adminService.getHealth().pipe(takeUntil(this.logout$)).subscribe({
      next: r => {
        if (!this.isAuthenticated()) return;
        if (r.is_success && r.data) localStorage.setItem('emotra_admin_health', JSON.stringify(r.data));
      },
      error: () => {}
    });

    // 6. Support (Queue)
    this.adminService.getSupportMessages(1, 100).pipe(takeUntil(this.logout$)).subscribe({
      next: r => {
        if (!this.isAuthenticated()) return;
        if (r.is_success && r.data) {
          localStorage.setItem('emotra_admin_support', JSON.stringify(r.data));
        }
      },
      error: () => {}
    });
  }

  /**
   * Returns whether the window is currently unloading (refreshing/navigating away)
   */
  getIsUnloading(): boolean {
    return this.isUnloading;
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
