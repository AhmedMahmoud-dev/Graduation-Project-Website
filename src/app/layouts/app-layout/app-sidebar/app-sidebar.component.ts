import { Component, signal, HostListener, inject, effect, PLATFORM_ID, Input, computed } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { DomSanitizer } from '@angular/platform-browser';
import { AuthService } from '../../../core/services/auth.service';
import { AlertsService } from '../../../core/services/alerts.service';
import { TooltipComponent } from '../../../shared/components/tooltip/tooltip.component';

@Component({
  selector: 'app-app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule, TooltipComponent],
  templateUrl: './app-sidebar.component.html',
  styleUrl: './app-sidebar.component.css'
})
export class AppSidebarComponent {
  public authService = inject(AuthService);
  private router = inject(Router);
  private sanitizer = inject(DomSanitizer);

  get isLandingPage(): boolean {
    return this.router.url === '/' || this.router.url.startsWith('/#');
  }

  get routerURL(): string {
    return this.router.url;
  }

  isActiveSection(href: string): boolean {
    if (!this.isBrowser) return false;
    // Check if it matches the manually set active section and is not empty
    const current = this.activeLandingSection();
    return current !== '' && current === href;
  }
  private isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly APP_SIDEBAR_STATE_KEY = 'emotra_sidebar_expanded';

  // State
  isExpanded = signal<boolean>(
    this.isBrowser ? localStorage.getItem(this.APP_SIDEBAR_STATE_KEY) !== 'false' : true
  );
  activeLandingSection = signal<string>(
    this.isBrowser ? (window.location.hash || '') : ''
  );
  isMobile = signal<boolean>(this.isBrowser ? window.innerWidth < 1024 : false);
  mobileOpen = signal<boolean>(false);
  emailCopied = signal<boolean>(false);
  currentUser = this.authService.currentUser;
  private alertsService = inject(AlertsService);
  unreadCount = this.alertsService.unreadCount;
  hasUnreadAlerts = computed(() => this.unreadCount() > 0);

  constructor() {
    effect(() => {
      if (this.isBrowser) {
        let width = '0px';
        if (!this.isMobile()) {
          width = this.isExpanded() ? '260px' : '72px';
        }
        document.documentElement.style.setProperty('--app-sidebar-width', width);
        localStorage.setItem(this.APP_SIDEBAR_STATE_KEY, this.isExpanded().toString());
      }
    });
  }

  appNavItems = [
    { label: 'Dashboard', path: '/dashboard', icon: this.sanitizer.bypassSecurityTrustHtml('<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>') },
    { label: 'Analysis', path: '/analysis', icon: this.sanitizer.bypassSecurityTrustHtml('<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M22 12h-4l-3 9L9 3l-3 9H2"></path></svg>') },
    { label: 'History', path: '/history', icon: this.sanitizer.bypassSecurityTrustHtml('<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>') },
    { label: 'Compare', path: '/compare', icon: this.sanitizer.bypassSecurityTrustHtml('<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="18" r="3"></circle><circle cx="6" cy="6" r="3"></circle><path d="M13 6h3a2 2 0 0 1 2 2v7"></path><path d="M11 18H8a2 2 0 0 1-2-2V9"></path></svg>') },
    { label: 'Alerts', path: '/alerts', icon: this.sanitizer.bypassSecurityTrustHtml('<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>') },
    { label: 'Back to Landing', path: '/', icon: this.sanitizer.bypassSecurityTrustHtml('<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>') },
  ];

  landingNavItems = [
    {
      label: 'Features',
      href: '#features',
      icon: this.sanitizer.bypassSecurityTrustHtml(`
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M7 8h10M7 12h10M7 16h10M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z"/>
        </svg>
      `)
    },
    { label: 'How It Works', href: '#how-it-works', icon: this.sanitizer.bypassSecurityTrustHtml('<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>') },
    { label: 'Pricing', href: '#pricing', icon: this.sanitizer.bypassSecurityTrustHtml('<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>') }
  ];

  @HostListener('window:resize')
  onResize() {
    if (typeof window !== 'undefined') {
      this.isMobile.set(window.innerWidth < 1024);
      if (!this.isMobile()) {
        this.mobileOpen.set(false);
      }
    }
  }

  toggleSidebar() { this.isExpanded.update(v => !v); }
  toggleMobile() { this.mobileOpen.update(v => !v); }
  closeMobile() { this.mobileOpen.set(false); }

  handleNavClick() {
    if (this.isMobile()) this.closeMobile();
  }

  handleLandingNavClick(event: Event, href: string) {
    event.preventDefault();
    this.handleNavClick();

    // If we are not on the landing page, navigate to it first
    if (this.router.url.split('#')[0] !== '/') {
      this.activeLandingSection.set(href);
      this.router.navigate(['/'], { fragment: href.replace('#', '') });
      return;
    }

    this.activeLandingSection.set(href);
    const element = document.querySelector(href);
    if (element) element.scrollIntoView({ behavior: 'smooth' });
  }

  navigateTo(path: string) {
    this.handleNavClick();
    this.router.navigate([path]);
  }

  getUserInitials(): string {
    const user = this.currentUser();
    if (!user || !user.full_name) return 'U';
    const parts = user.full_name.split(' ');
    if (parts.length >= 2) return parts[0][0].toUpperCase() + parts[1][0].toUpperCase();
    return parts[0][0].toUpperCase();
  }

  logout() {
    this.authService.logout();
  }
 
  copyEmailToClipboard(event: Event) {
    event.stopPropagation();
    const email = this.currentUser()?.email;
    if (email) {
      navigator.clipboard.writeText(email).then(() => {
        this.emailCopied.set(true);
        setTimeout(() => this.emailCopied.set(false), 2000);
      });
    }
  }

  goToHome() {
    this.handleNavClick();
    if (this.currentUser()) {
      this.router.navigate(['/dashboard']);
    } else {
      this.router.navigate(['/']);
    }
  }
}
