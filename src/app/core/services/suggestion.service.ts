import { Injectable, inject, signal, computed, PLATFORM_ID, Inject, effect } from '@angular/core';
import { Router } from '@angular/router';
import { isPlatformBrowser } from '@angular/common';
import { AuthService } from './auth.service';
import { FeedbackService } from './feedback.service';
import { AnalysisStorageService } from './analysis-storage.service';
import { SystemFeedbackUIService } from './system-feedback-ui.service';
import { ShortcutService } from './shortcut.service';
import { AnalysisV2Service } from './analysis-v2.service';
import { NotificationSettingsService } from './notification-settings.service';

export interface Suggestion {
  type: 'theme' | 'feedback' | 'multimodal' | 'share' | 'compare' | 'notifications' | 'shortcuts';
  title: string;
  description: string;
  actionLabel: string;
}

@Injectable({
  providedIn: 'root'
})
export class SuggestionService {
  private router = inject(Router);
  private authService = inject(AuthService);
  private feedbackService = inject(FeedbackService);
  private analysisStorageService = inject(AnalysisStorageService);
  private feedbackUiService = inject(SystemFeedbackUIService);
  private shortcutService = inject(ShortcutService);
  private analysisV2Service = inject(AnalysisV2Service);
  private notificationSettingsService = inject(NotificationSettingsService);

  private sessionStartTime = Date.now();
  private isBrowser = false;
  private intervalId: any;

  // Signal holding the active suggestion (or null)
  public activeSuggestion = signal<Suggestion | null>(null);

  // Cache to track if the user has active share links (null = unchecked)
  private hasSharedLinks = signal<boolean | null>(null);

  // Tracks if the user is currently typing in an input element
  private isTypingSignal = signal(false);
  public isTyping = this.isTypingSignal.asReadonly();

  // Computed checks to suppress suggestion card display
  public isModalOpen = computed(() => 
    this.shortcutService.isHelpOpen() || this.feedbackUiService.isOpen()
  );

  public shouldShow = computed(() => 
    this.activeSuggestion() !== null && !this.isTypingSignal() && !this.isModalOpen()
  );

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {
    this.isBrowser = isPlatformBrowser(this.platformId);
    // Smart suggestions disabled for now
    /*
    if (this.isBrowser) {
      this.initTypingListeners();
      this.startBackgroundTimer();

      // Reactively mark when the user opens the shortcuts modal to avoid suggesting it
      effect(() => {
        if (this.shortcutService.isHelpOpen()) {
          localStorage.setItem('emotra_shortcut_modal_opened', 'true');
        }
      });
    }
    */
  }

  private initTypingListeners(): void {
    const checkTypingState = () => {
      if (typeof document === 'undefined') return;
      const activeEl = document.activeElement;
      const isTyping = !!(activeEl && (
        activeEl.tagName === 'INPUT' ||
        activeEl.tagName === 'TEXTAREA' ||
        activeEl.getAttribute('contenteditable') === 'true'
      ));
      this.isTypingSignal.set(isTyping);
    };

    window.addEventListener('focusin', checkTypingState);
    window.addEventListener('focusout', checkTypingState);
  }

  private startBackgroundTimer(): void {
    // Run evaluation check every 30 seconds
    this.intervalId = setInterval(() => {
      this.evaluateSuggestions();
    }, 30000);
  }

  public evaluateSuggestions(): void {
    // Smart suggestions disabled for now
  }

  private showSuggestion(suggestion: Suggestion): void {
    this.activeSuggestion.set(suggestion);
    localStorage.setItem('emotra_suggest_last_shown', Date.now().toString());
  }

  public dismiss(): void {
    const current = this.activeSuggestion();
    if (current) {
      localStorage.setItem(`emotra_suggest_${current.type}_dismissed`, 'true');
      this.activeSuggestion.set(null);
    }
  }

  public executeAction(): void {
    const current = this.activeSuggestion();
    if (current) {
      // Mark as dismissed permanently so it is never suggested again
      localStorage.setItem(`emotra_suggest_${current.type}_dismissed`, 'true');
      this.activeSuggestion.set(null);

      // Perform redirection or modal trigger
      if (current.type === 'theme') {
        this.router.navigate(['/settings']);
      } else if (current.type === 'feedback') {
        this.feedbackUiService.open();
      } else if (current.type === 'multimodal') {
        this.router.navigate(['/analysis']);
      } else if (current.type === 'share') {
        this.router.navigate(['/history']);
      } else if (current.type === 'compare') {
        this.router.navigate(['/compare']);
      } else if (current.type === 'notifications') {
        this.router.navigate(['/settings/notifications']);
      } else if (current.type === 'shortcuts') {
        this.shortcutService.toggleHelpModal();
      }
    }
  }
}
