import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const apiInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);

  // 1. Skip auth for login and register endpoints
  const isAuthEndpoint = req.url.toLowerCase().includes('/api/auth/login') ||
    req.url.toLowerCase().includes('/api/auth/register') ||
    req.url.toLowerCase().includes('/api/auth/forgot-password') ||
    req.url.toLowerCase().includes('/api/auth/reset-password');

  let authReq = req;

  // 2. Attach JWT token from signal if exists
  const user = authService.currentUser();
  if (!isAuthEndpoint && user?.token) {
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
      // 3. Handle 401 and 403: Clear state and redirect
      if (error.status === 401 || error.status === 403) {
        // If 403 and body contains ban details, store them for the login page notice
        if (error.status === 403 && error.error?.ban_reason) {
          authService.storeBanDetails({
            ban_reason: error.error.ban_reason,
            ban_expires_at: error.error.ban_expires_at,
            is_permanent: error.error.is_permanent
          });
        }
        authService.logout(true);
      }

      // Handle other errors normally
      return throwError(() => error);
    })
  );
};