import { Component, viewChild, inject, signal } from '@angular/core';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { AppSidebarComponent } from './app-sidebar/app-sidebar.component';
import { AppNavbarComponent } from './app-navbar/app-navbar.component';
import { filter } from 'rxjs/operators';
import { CommonModule } from '@angular/common';
import { SystemFeedbackComponent } from '../../shared/components/system-feedback/system-feedback.component';

@Component({
  selector: 'app-app-layout',
  standalone: true,
  imports: [RouterOutlet, AppSidebarComponent, AppNavbarComponent, CommonModule, SystemFeedbackComponent],
  templateUrl: './app-layout.component.html'
})
export class AppLayoutComponent {
  private router = inject(Router);

  showSidebar = signal(true);
  _isDocPage = signal(false);
  isDocPage = this._isDocPage.asReadonly();

  _isFullWidthPage = signal(false);
  isFullWidthPage = this._isFullWidthPage.asReadonly();

  // Use viewChild to safely access the sidebar component if it exists
  sidebar = viewChild<AppSidebarComponent>('sidebar');

  constructor() {
    // Initial check
    this.updateSidebarVisibility(this.router.url);

    // Track route changes
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      this.updateSidebarVisibility(event.urlAfterRedirects);
    });
  }

  toggleMobile() {
    this.sidebar()?.toggleMobile();
  }

  private updateSidebarVisibility(url: string) {
    const isDoc = url.includes('/models/');
    // Show sidebar for all pages under AppLayout
    this.showSidebar.set(true);
    this._isDocPage.set(isDoc);

    const fullWidthRoutes = ['/dashboard', '/analysis', '/history', '/alerts', '/settings', '/compare'];
    const isFullWidth = fullWidthRoutes.some(route => url.includes(route));
    this._isFullWidthPage.set(isFullWidth || isDoc);
  }
}
