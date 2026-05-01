import { Component, inject, signal, Input, Output, EventEmitter, computed } from '@angular/core';
import { BugReportModalComponent } from '../../../shared/components/bug-report-modal/bug-report-modal.component';

import { Router, NavigationEnd, RouterLink } from '@angular/router';
import { filter } from 'rxjs/operators';
import { ThemeService, ThemeMode } from '../../../core/services/theme.service';
import { AuthService } from '../../../core/services/auth.service';
import { AlertsService } from '../../../core/services/alerts.service';
import { SettingsApiService } from '../../../core/services/settings-api.service';

import { TooltipComponent } from '../../../shared/components/tooltip/tooltip.component';


@Component({
  selector: 'app-app-navbar',
  standalone: true,
  imports: [RouterLink, TooltipComponent, BugReportModalComponent],
  templateUrl: './app-navbar.component.html'
})
export class AppNavbarComponent {
  private themeService = inject(ThemeService);
  public authService = inject(AuthService);
  private alertsService = inject(AlertsService);
  private router = inject(Router);
  private settingsApiService = inject(SettingsApiService);

  @Input() hideToggle = false;
  @Output() toggleMenu = new EventEmitter<void>();

  currentTheme = this.themeService.currentTheme;
  currentUser = this.authService.currentUser;
  userMenuOpen = signal<boolean>(false);
  bugReportOpen = signal<boolean>(false);
  unreadCount = this.alertsService.unreadCount;
  isAdmin = computed(() => this.currentUser()?.roles?.includes('ADMIN'));

  get isLandingPage(): boolean {
    return this.router.url === '/' || this.router.url.startsWith('/#');
  }

  pageTitle = signal<string>('Dashboard');

  constructor() {
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      const path = event.urlAfterRedirects.split('/')[1];
      this.pageTitle.set(path ? path.charAt(0).toUpperCase() + path.slice(1) : 'Dashboard');
    });
  }

  setTheme(theme: ThemeMode) {
    this.themeService.setTheme(theme);

    // Persist to backend if authenticated
    if (this.authService.isAuthenticated()) {
      this.settingsApiService.updateAppearanceSettings({ active_theme: theme }).subscribe();
    }
  }

  toggleUserMenu() {
    this.userMenuOpen.update(v => !v);
  }

  closeUserMenu() {
    this.userMenuOpen.set(false);
  }

  getUserInitials(): string {
    const user = this.currentUser();
    if (!user || !user.full_name) return 'U';
    const parts = user.full_name.split(' ');
    if (parts.length >= 2) return parts[0][0].toUpperCase() + parts[1][0].toUpperCase();
    return parts[0][0].toUpperCase();
  }

  openBugReport() {
    this.closeUserMenu();
    this.bugReportOpen.set(true);
  }

  closeBugReport() {
    this.bugReportOpen.set(false);
  }

  logout() {
    this.closeUserMenu();
    this.authService.logout();
  }
}
