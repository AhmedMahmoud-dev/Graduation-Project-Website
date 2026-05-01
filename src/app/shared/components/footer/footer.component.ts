import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { ThemeService, ThemeMode } from '../../../core/services/theme.service';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { FeedbackService } from '../../../core/services/feedback.service';
import { SystemFeedbackUIService } from '../../../core/services/system-feedback-ui.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-footer-section',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './footer.component.html'
})
export class FooterSectionComponent implements OnInit {
  private router = inject(Router);
  private themeService = inject(ThemeService);
  private authService = inject(AuthService);
  private feedbackService = inject(FeedbackService);
  private uiService = inject(SystemFeedbackUIService);

  currentTheme = this.themeService.currentTheme;
  currentUser = this.authService.currentUser;
  hasFeedback = signal(false);
  isAdmin = computed(() => this.currentUser()?.roles?.includes('ADMIN'));

  ngOnInit() {
    this.checkFeedbackStatus();
  }

  checkFeedbackStatus() {
    // Don't check for system feedback if not authenticated or if Admin
    if (!this.authService.isAuthenticated() || this.isAdmin()) return;

    // 1. Check Cache First for instant UI update
    const cached = this.feedbackService.getCachedSystemFeedback();
    if (cached) {
      this.hasFeedback.set(true);
    }

    // 2. Background sync with API
    this.feedbackService.getMyFeedbackHistory(1, 10).subscribe({
      next: (response: any) => {
        if (response.is_success && response.data) {
          const systemRef = response.data.find((f: any) => f.feedback_type === 'system');
          this.hasFeedback.set(!!systemRef);

          if (systemRef) {
            this.feedbackService.cacheSystemFeedback(systemRef);
          } else {
            this.feedbackService.removeCachedSystemFeedback();
          }
        }
      }
    });
  }

  openFeedback() {
    this.uiService.open();
  }

  logout() {
    this.authService.logout();
  }

  navigateTo(path: string) {
    this.router.navigate([path]);
  }

  scrollTo(sectionId: string, event: Event) {
    event.preventDefault();

    const fragment = sectionId.replace('#', '');
    const currentPath = this.router.url.split('#')[0].split('?')[0];

    // If we are not on the landing page, navigate to it with the fragment
    if (currentPath !== '' && currentPath !== '/') {
      this.router.navigate(['/'], { fragment: fragment });
      return;
    }

    // On same page: smooth scroll
    try {
      const element = document.querySelector(sectionId);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
        // Update URL hash without jumping
        window.history.pushState(null, '', `/#${fragment}`);
      }
    } catch (e) {
      console.error('Scroll error:', e);
    }
  }

  setTheme(theme: ThemeMode) {
    this.themeService.setTheme(theme);
  }
}
