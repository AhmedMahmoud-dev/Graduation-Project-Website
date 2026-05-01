import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated()) {
    const user = authService.currentUser();
    const isAdmin = user?.roles?.includes('ADMIN');

    // If Admin tries to access non-admin pages, redirect to admin dashboard
    // Exception: /settings is allowed (restricted to Appearance tab inside the component)
    if (isAdmin && !state.url.startsWith('/admin') && !state.url.startsWith('/auth') && !state.url.startsWith('/settings')) {
      return router.parseUrl('/admin/dashboard');
    }

    return true;
  }

  return router.parseUrl('/auth/login');
};

export const guestGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isAuthenticated()) {
    return true;
  }

  const user = authService.currentUser();
  const isAdmin = user?.roles?.includes('ADMIN');
  return router.parseUrl(isAdmin ? '/admin/dashboard' : '/dashboard');
};

export const resetPasswordGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.resetEmailInitiated()) {
    return true;
  }

  return router.parseUrl('/auth/forgot-password');
};

export const noAdminGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated()) {
    const user = authService.currentUser();
    const isAdmin = user?.roles?.includes('ADMIN');
    if (isAdmin) {
      return router.parseUrl('/admin/dashboard');
    }
  }

  return true;
};
