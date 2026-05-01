import { Component, inject, signal, OnInit, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FeedbackService } from '../../../core/services/feedback.service';
import { ToastService } from '../../../core/services/toast.service';
import { SystemFeedbackUIService } from '../../../core/services/system-feedback-ui.service';
import { SystemFeedbackResponse, ModerationStatus } from '../../../core/models/feedback.model';
import { ApiResponse } from '../../../core/models/api-response.model';
import { Router, NavigationEnd } from '@angular/router';
import { finalize, filter } from 'rxjs';
import { TooltipComponent } from '../tooltip/tooltip.component';
import { computed } from '@angular/core';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-system-feedback',
  standalone: true,
  imports: [CommonModule, FormsModule, TooltipComponent],
  templateUrl: './system-feedback.component.html',
  styleUrl: './system-feedback.component.css'
})
export class SystemFeedbackComponent implements OnInit {
  private feedbackService = inject(FeedbackService);
  private toastService = inject(ToastService);
  private uiService = inject(SystemFeedbackUIService);
  private router = inject(Router);
  private authService = inject(AuthService);

  // Use the UI service signal for visibility
  isOpen = this.uiService.isOpen;
  isSubmitting = signal(false);
  isLoadingData = signal(false);

  // Reactive URL tracking
  private currentUrl = signal(this.router.url);

  // Logic bits
  hasSubmittedBefore = signal(false);
  private hasFetchedHistory = false;

  // Computed visibility: Show on all pages EXCEPT landing, ONLY for logged-in users who HAVEN'T submitted yet
  showFloatingButton = computed(() => {
    const url = this.currentUrl();
    const isLandingPage = url === '/' || url === '' || url.split('?')[0] === '/' || url.startsWith('/#');

    // 1. Never show on landing page
    if (isLandingPage) return false;

    // 2. Only show for authenticated users
    const user = this.authService.currentUser();
    if (!user) return false;

    // 2.1 Hide for Admins
    if (user.roles?.includes('ADMIN')) return false;

    // 3. Hide if the user has already submitted feedback
    if (this.hasSubmittedBefore()) return false;

    return true;
  });

  // Form State
  rating = signal(0);
  comment = signal('');
  isPublic = signal(true);
  moderationStatus = signal<ModerationStatus | null>(null);
  existingId = signal<number | null>(null);

  // Validation
  showRatingError = signal(false);
  showCommentError = signal(false);

  // Initial state for change detection
  private initialState = signal<{ rating: number, comment: string, isPublic: boolean } | null>(null);

  /** Whether the current form values differ from the saved state */
  hasChanges = computed(() => {
    // If we've never submitted before, any valid rating/comment counts as a change
    if (!this.hasSubmittedBefore()) return this.rating() > 0 && this.comment().trim().length > 0;

    const init = this.initialState();
    if (!init) return true;

    return this.rating() !== init.rating ||
      this.comment().trim() !== init.comment.trim() ||
      this.isPublic() !== init.isPublic;
  });

  // Tooltip helper
  hoverRating = signal(0);
  ratingLabels: Record<number, string> = {
    1: 'Poor',
    2: 'Fair',
    3: 'Good',
    4: 'Very Good',
    5: 'Excellent'
  };

  constructor() {
    // 1. Listen for route changes to update floating button visibility
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      this.currentUrl.set(event.urlAfterRedirects || this.router.url);
    });

    // 2. Background scroll locking
    effect(() => {
      if (this.isOpen()) {
        document.body.classList.add('no-scroll');
      } else {
        document.body.classList.remove('no-scroll');
      }
    });
  }

  ngOnInit() {
    this.refreshStatus();
  }

  refreshStatus() {
    // 1. Check Cache First
    const cached = this.feedbackService.getCachedSystemFeedback();
    if (cached) {
      this.hasSubmittedBefore.set(true);
      this.existingId.set(cached.id);
      this.rating.set(cached.rating);
      this.comment.set(cached.comment || '');
      this.isPublic.set(cached.is_public ?? true);
      // Ensure we have a valid status signal value if they previously submitted
      this.moderationStatus.set(cached.moderation_status || 'Pending');
      this.initialState.set({
        rating: cached.rating,
        comment: cached.comment || '',
        isPublic: cached.is_public ?? true
      });
      // We still run the API refresh in background to keep cache synced
    }

    // 2. Fetch from API only if authenticated
    if (this.authService.isAuthenticated()) {
      this.feedbackService.getMyFeedbackHistory(1, 10).subscribe({
        next: (response: any) => {
          this.hasFetchedHistory = true;

          if (response.is_success && response.data) {
            const systemRef = response.data.find((f: any) => f.feedback_type === 'system');
            if (systemRef) {
              this.hasSubmittedBefore.set(true);
              this.existingId.set(systemRef.id);
              this.rating.set(systemRef.rating);
               this.comment.set(systemRef.comment || '');
              this.isPublic.set(systemRef.is_public ?? true);
              // If server returns status, use it. If null (private item), use 'Pending' as fallback
              this.moderationStatus.set(systemRef.moderation_status || 'Pending');
              this.initialState.set({
                rating: systemRef.rating,
                comment: systemRef.comment || '',
                isPublic: systemRef.is_public ?? true
              });
              this.feedbackService.cacheSystemFeedback(systemRef);
            } else {
              this.hasSubmittedBefore.set(false);
              this.feedbackService.removeCachedSystemFeedback();
            }
          }
        },
        error: () => {
          this.hasFetchedHistory = true;
        }
      });
    }
  }

  openModal() {
    this.uiService.open();
    this.showRatingError.set(false);
    this.showCommentError.set(false);

    // Refresh data in case they updated it elsewhere
    if (this.authService.isAuthenticated()) {
      if (!this.hasFetchedHistory) {
        this.isLoadingData.set(true);
      }

      this.feedbackService.getMyFeedbackHistory(1, 10)
        .pipe(finalize(() => {
          this.isLoadingData.set(false);
          this.hasFetchedHistory = true;
        }))
        .subscribe({
          next: (response: any) => {
            if (response.is_success && response.data) {
              const systemRef = response.data.find((f: any) => f.feedback_type === 'system');
              if (systemRef) {
                this.rating.set(systemRef.rating);
                this.comment.set(systemRef.comment || '');
                this.isPublic.set(systemRef.is_public ?? true);
                
                // Update status from server, fallback to current or 'Pending'
                this.moderationStatus.set(systemRef.moderation_status || this.moderationStatus() || 'Pending');
                
                this.existingId.set(systemRef.id);
                this.hasSubmittedBefore.set(true);
                this.initialState.set({
                  rating: systemRef.rating,
                  comment: systemRef.comment || '',
                  isPublic: systemRef.is_public ?? true
                });
                this.feedbackService.cacheSystemFeedback(systemRef);
              }
            }
          }
        });
    } else {
      this.isLoadingData.set(false);
    }
  }

  closeModal() {
    this.uiService.close();
    this.showRatingError.set(false);
    this.showCommentError.set(false);
  }

  submit() {
    let hasError = false;
    if (this.rating() === 0) {
      this.showRatingError.set(true);
      hasError = true;
    } else {
      this.showRatingError.set(false);
    }

    if (!this.comment().trim()) {
      this.showCommentError.set(true);
      hasError = true;
    } else {
      this.showCommentError.set(false);
    }

    if (hasError) return;

    this.isSubmitting.set(true);
    this.feedbackService.submitSystemFeedback({
      rating: this.rating(),
      comment: this.comment().trim(),
      is_public: this.isPublic()
    }).pipe(finalize(() => this.isSubmitting.set(false)))
      .subscribe({
        next: (response: ApiResponse<SystemFeedbackResponse>) => {
          if (response.is_success && response.data) {
            this.toastService.show(
              'Feedback Received',
              this.existingId() ? 'Your review has been updated. Thank you!' : 'Thank you for your valuable feedback!',
              'success',
              'check'
            );
            this.hasSubmittedBefore.set(true);
            this.existingId.set(response.data.id);
            this.initialState.set({
              rating: response.data.rating,
              comment: response.data.comment || '',
              isPublic: response.data.is_public ?? true
            });
            // If server returns status, use it. Otherwise, if it was already known, keep it (unless edited).
            // Default to Pending for new/updated submissions if server is silent.
            this.moderationStatus.set(response.data.moderation_status || 'Pending');
            this.feedbackService.cacheSystemFeedback(response.data);
            this.closeModal();
          }
        },
        error: () => {
          this.toastService.show('Error', 'Could not save your feedback. Please try again.', 'error');
        }
      });
  }
}
