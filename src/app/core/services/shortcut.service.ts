import { Injectable, inject, signal, PLATFORM_ID, Inject } from '@angular/core';
import { Router } from '@angular/router';
import { isPlatformBrowser } from '@angular/common';
import { ThemeService } from './theme.service';
import { SystemFeedbackUIService } from './system-feedback-ui.service';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class ShortcutService {
  private router = inject(Router);
  private themeService = inject(ThemeService);
  private feedbackUiService = inject(SystemFeedbackUIService);
  private authService = inject(AuthService);

  private isHelpOpenSignal = signal(false);
  public isHelpOpen = this.isHelpOpenSignal.asReadonly();

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {
    if (isPlatformBrowser(this.platformId)) {
      this.initShortcutListeners();
    }
  }

  public toggleHelpModal() {
    this.isHelpOpenSignal.update(val => !val);
  }

  public closeHelpModal() {
    this.isHelpOpenSignal.set(false);
  }

  private initShortcutListeners() {
    window.addEventListener('keydown', (event: KeyboardEvent) => {
      // Check if user is typing in input or textarea
      const target = event.target as HTMLElement;
      const isTyping = target && (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.hasAttribute('contenteditable')
      );

      // We allow Escape to close our help modal even if typing
      if (event.key === 'Escape') {
        if (this.isHelpOpenSignal()) {
          this.closeHelpModal();
          event.preventDefault();
        }
        return;
      }

      // All other shortcuts are only allowed if not typing
      if (isTyping) {
        return;
      }

      // Alt key combos
      if (event.altKey && !event.ctrlKey && !event.metaKey) {
        const key = event.key.toLowerCase();
        
        // Theme toggle and Help Modal work everywhere (even on landing page, logged out)
        if (key === 'l') { // Toggle Theme
          this.toggleTheme();
          event.preventDefault();
          return;
        }

        if (key === 'k' || key === '/' || key === '?') { // Toggle Help Modal
          this.toggleHelpModal();
          event.preventDefault();
          return;
        }

        // All navigation & feedback shortcuts require authentication
        if (!this.authService.isAuthenticated()) {
          return;
        }

        switch (key) {
          // Navigation shortcuts
          case 'd': // Dashboard
            this.navigate('/dashboard');
            event.preventDefault();
            break;
          case 't': // Text Analysis
            this.navigate('/analysis/text');
            event.preventDefault();
            break;
          case 'a': // Audio Analysis
            this.navigate('/analysis/audio');
            event.preventDefault();
            break;
          case 'i': // Image Analysis
            this.navigate('/analysis/image');
            event.preventDefault();
            break;
          case 'v': // Video Analysis
            this.navigate('/analysis/video');
            event.preventDefault();
            break;
          case 'u': // Analysis Hub
            this.navigate('/analysis');
            event.preventDefault();
            break;
          case 'h': // History
            this.navigate('/history');
            event.preventDefault();
            break;
          case 'c': // Compare
            this.navigate('/compare');
            event.preventDefault();
            break;
          case 's': // Settings
            this.navigate('/settings');
            event.preventDefault();
            break;
          case 'f': // Toggle Feedback Modal
            this.toggleFeedback();
            event.preventDefault();
            break;
          case 'b': // Toggle Rate Button Visibility
            this.toggleRateButton();
            event.preventDefault();
            break;
        }
      }
    });
  }

  private navigate(path: string) {
    this.closeHelpModal(); // Close shortcuts help modal if open when navigating
    this.router.navigate([path]);
  }

  private toggleTheme() {
    const resolved = this.themeService.resolvedTheme();
    const nextMode = resolved === 'light' ? 'dark' : 'light';
    this.themeService.setTheme(nextMode);
  }

  private toggleFeedback() {
    const isOpen = this.feedbackUiService.isOpen();
    if (isOpen) {
      this.feedbackUiService.close();
    } else {
      this.feedbackUiService.open();
    }
  }

  private toggleRateButton() {
    this.feedbackUiService.toggleRateButtonVisibility();
  }
}
