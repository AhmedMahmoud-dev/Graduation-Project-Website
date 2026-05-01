import { Component, EventEmitter, Output, inject, signal } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { AuthService } from '../../../core/services/auth.service';
import { ThemeService, ThemeMode } from '../../../core/services/theme.service';

@Component({
  selector: 'app-admin-topbar',
  standalone: true,
  imports: [],
  templateUrl: './admin-topbar.component.html',
  styleUrl: './admin-topbar.component.css'
})
export class AdminTopbarComponent {
  private router = inject(Router);
  public authService = inject(AuthService);
  private themeService = inject(ThemeService);

  @Output() toggleSidebar = new EventEmitter<void>();

  pageTitle = signal<string>('Admin Dashboard');
  currentUser = this.authService.currentUser;
  currentTheme = this.themeService.currentTheme;
  userMenuOpen = signal<boolean>(false);

  constructor() {
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      const parts = event.urlAfterRedirects.split('/');
      const page = parts[parts.length - 1];
      if (page) {
        this.pageTitle.set(page.charAt(0).toUpperCase() + page.slice(1).replace('-', ' '));
      } else {
        this.pageTitle.set('Admin Dashboard');
      }
    });
  }

  setTheme(theme: ThemeMode) {
    this.themeService.setTheme(theme);
  }

  toggleUserMenu() {
    this.userMenuOpen.update(v => !v);
  }

  closeUserMenu() {
    this.userMenuOpen.set(false);
  }

  getUserInitials(): string {
    const user = this.currentUser();
    if (!user || !user.full_name) return 'A';
    const parts = user.full_name.split(' ');
    if (parts.length >= 2) return parts[0][0].toUpperCase() + parts[1][0].toUpperCase();
    return parts[0][0].toUpperCase();
  }

  logout() {
    this.closeUserMenu();
    this.authService.logout();
  }
}
