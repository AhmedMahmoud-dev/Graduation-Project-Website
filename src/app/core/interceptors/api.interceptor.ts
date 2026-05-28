import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { environment } from '../../../environments/environment';

export const apiInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);

  // 1. Skip auth for login and register endpoints
  const isAuthEndpoint = req.url.toLowerCase().includes('/api/auth/login') ||
    req.url.toLowerCase().includes('/api/auth/register') ||
    req.url.toLowerCase().includes('/api/auth/forgot-password') ||
    req.url.toLowerCase().includes('/api/auth/reset-password') ||
    req.url.toLowerCase().includes('/api/analysis/shared/');

  let authReq = req;

  // 2. Attach JWT token ONLY for the main .NET API, not for ML backend microservices.
  //    ML backends (text/audio/image/video) are standalone Python services that don't
  //    use JWT auth. Sending Authorization headers to them triggers CORS preflight
  //    failures since they don't include Authorization in Access-Control-Allow-Headers.
  const isMainApi = req.url.startsWith(environment.apiUrl);
  const user = authService.currentUser();
  if (isMainApi && !isAuthEndpoint && user?.token) {
    authReq = req.clone({
      setHeaders: {
        Authorization: `Bearer ${user.token}`
      }
    });
  }

  // 3. Strip Content-Type for FormData so the browser auto-sets
  //    multipart/form-data with the correct boundary.
  //    withFetch() can incorrectly apply application/json to FormData bodies.
  if (authReq.body instanceof FormData) {
    authReq = authReq.clone({
      headers: authReq.headers.delete('Content-Type')
    });
  }

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      // 4. Handle 401, 403, and 0 (CORS/Ban short-circuits) ONLY for the main API
      if (isMainApi && (error.status === 401 || error.status === 403 || (error.status === 0 && navigator.onLine && !authService.getIsUnloading()))) {
        if (error.status === 403 && error.error?.data?.ban_reason) {
          authService.storeBanDetails(error.error.data);
        }

        // Wipe local credentials immediately to block AuthGuard and reactive UI
        authService.clearAllAuth();

        // Only call logout if the app is fully initialized (router is ready)
        // During app init, verifySessionWithServer() handles the redirect itself
        // via window.location.href — calling logout() here during init causes
        // a race condition between router.navigate() and window.location.href
        if (authService.isAppInitialized()) {
          authService.logout(true);
        }
      }

      // Handle other errors normally
      return throwError(() => error);
    })
  );
};