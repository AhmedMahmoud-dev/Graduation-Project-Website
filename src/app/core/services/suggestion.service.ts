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
    if (!this.isBrowser) return;

    // 1. Auth Guard
    if (!this.authService.isAuthenticated()) {
      return;
    }

    // 2. Safety Delay: User must be active on the page for at least 60 seconds in current session
    if (Date.now() - this.sessionStartTime < 60000) {
      return;
    }

    // 3. Already showing a suggestion
    if (this.activeSuggestion()) {
      return;
    }

    // 4. Global Cooldown: Limit to one suggestion every 24 hours
    const lastShownStr = localStorage.getItem('emotra_suggest_last_shown');
    if (lastShownStr) {
      const lastShown = parseInt(lastShownStr, 10);
      if (Date.now() - lastShown < 24 * 60 * 60 * 1000) {
        return;
      }
    }

    // Background fetch check for shared links if authenticated and not checked yet
    if (this.hasSharedLinks() === null) {
      this.hasSharedLinks.set(false); // set temporarily to prevent multiple simultaneous requests
      this.analysisV2Service.getSharedAnalyses(1, 1).subscribe({
        next: (res) => {
          this.hasSharedLinks.set(res.is_success && res.total > 0);
        },
        error: () => {
          this.hasSharedLinks.set(null); // reset on error so it can retry
        }
      });
    }

    // --- SUGGESTION TYPE EVALUATION ---
    const sessionCount = this.analysisStorageService.allSessions().length;

    // A. Accent/Theme Colors Personalization (Only suggest if they have run at least 1 session to avoid interrupting onboarding)
    const themeColorsDismissed = localStorage.getItem('emotra_suggest_theme_dismissed') === 'true';
    const customColorsExist = localStorage.getItem('emotra_theme_colors') !== null;
    if (!themeColorsDismissed && !customColorsExist && sessionCount >= 1) {
      this.showSuggestion({
        type: 'theme',
        title: 'Customize Your Palette',
        description: 'Personalize Emotra with your favorite theme colors and emotion colors in the settings.',
        actionLabel: 'Go to Settings'
      });
      return;
    }

    // B. Feedback Invite (Testimonial)
    const feedbackDismissed = localStorage.getItem('emotra_suggest_feedback_dismissed') === 'true';
    const hasFeedback = !!this.feedbackService.getCachedSystemFeedback() || 
                        !!localStorage.getItem('emotra_system_feedback');

    if (!feedbackDismissed && !hasFeedback && sessionCount >= 3) {
      this.showSuggestion({
        type: 'feedback',
        title: 'Enjoying Emotra?',
        description: 'We would love to hear your thoughts! Help us grow by rating your experience.',
        actionLabel: 'Rate Emotra'
      });
      return;
    }

    // C. Multimodal Exploration (Dynamic suggestions based on exact untried media types)
    const multimodalDismissed = localStorage.getItem('emotra_suggest_multimodal_dismissed') === 'true';
    const textCount = this.analysisStorageService.textSessions().length;
    const audioCount = this.analysisStorageService.audioSessions().length;
    const imageCount = this.analysisStorageService.imageSessions().length;
    const videoCount = this.analysisStorageService.videoSessions().length;

    const untriedTypes: string[] = [];
    if (audioCount === 0) untriedTypes.push('Audio');
    if (imageCount === 0) untriedTypes.push('Image');
    if (videoCount === 0) untriedTypes.push('Video');

    if (!multimodalDismissed && textCount >= 3 && untriedTypes.length > 0) {
      const typesList = untriedTypes.join(', ').replace(/,([^,]*)$/, ' and$1');
      this.showSuggestion({
        type: 'multimodal',
        title: 'Unlock Full Analysis',
        description: `You have run ${textCount} text analyses. Try uploading ${typesList.toLowerCase()} files to decode deeper emotions!`,
        actionLabel: 'Explore Hub'
      });
      return;
    }

    // D. Share Insights (Go to history page and share)
    const shareDismissed = localStorage.getItem('emotra_suggest_share_dismissed') === 'true';
    const hasShared = this.hasSharedLinks();
    if (!shareDismissed && hasShared === false && sessionCount >= 1) {
      this.showSuggestion({
        type: 'share',
        title: 'Share Your Insights',
        description: 'You have saved analysis sessions! Go to History, select a session, and generate a secure public link to share.',
        actionLabel: 'Go to History'
      });
      return;
    }

    // E. Compare Sessions (Side-by-side analysis comparison)
    const compareDismissed = localStorage.getItem('emotra_suggest_compare_dismissed') === 'true';
    if (!compareDismissed && sessionCount >= 2) {
      this.showSuggestion({
        type: 'compare',
        title: 'Compare Your Emotions',
        description: 'Track shifts in your emotional states by comparing two or more of your sessions side-by-side!',
        actionLabel: 'Compare Sessions'
      });
      return;
    }

    // F. Tune Notifications / Custom Thresholds
    const notificationsDismissed = localStorage.getItem('emotra_suggest_notifications_dismissed') === 'true';
    const hasDefaultNotifications = this.notificationSettingsService.isDefault();
    if (!notificationsDismissed && hasDefaultNotifications) {
      this.showSuggestion({
        type: 'notifications',
        title: 'Tune Your Alerts',
        description: 'Customize how alerts work. Adjust toast notifications, sound cues, and thresholds in settings.',
        actionLabel: 'Adjust Settings'
      });
      return;
    }

    // G. Keyboard Shortcuts
    const shortcutsDismissed = localStorage.getItem('emotra_suggest_shortcuts_dismissed') === 'true';
    const shortcutsModalOpened = localStorage.getItem('emotra_shortcut_modal_opened') === 'true';
    if (!shortcutsDismissed && !shortcutsModalOpened && sessionCount >= 2) {
      this.showSuggestion({
        type: 'shortcuts',
        title: 'Master the Shortcuts',
        description: 'Navigate Emotra faster! Try using keyboard shortcuts to jump between dashboard, settings, and analysis tools.',
        actionLabel: 'See Shortcuts'
      });
      return;
    }
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
