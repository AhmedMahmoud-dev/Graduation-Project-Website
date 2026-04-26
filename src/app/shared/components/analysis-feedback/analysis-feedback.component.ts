import { Component, input, OnInit, signal, inject, effect, untracked, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FeedbackService } from '../../../core/services/feedback.service';
import { ToastService } from '../../../core/services/toast.service';
import { AnalysisFeedbackResponse, AnalysisFeedbackRequest } from '../../../core/models/feedback.model';
import { finalize } from 'rxjs';
import { TooltipComponent } from '../tooltip/tooltip.component';
import { LoadingStateComponent } from '../loading-state/loading-state.component';

@Component({
  selector: 'app-analysis-feedback',
  standalone: true,
  imports: [CommonModule, FormsModule, TooltipComponent, LoadingStateComponent],
  templateUrl: './analysis-feedback.component.html',
  styleUrl: './analysis-feedback.component.css'
})
export class AnalysisFeedbackComponent implements OnInit {
  analysisId = input.required<string>(); // client_id UUID

  private feedbackService = inject(FeedbackService);
  private toastService = inject(ToastService);

  // State
  existingFeedback = signal<AnalysisFeedbackResponse | null>(null);
  isLoading = signal(true);
  isSubmitting = signal(false);
  isEditing = signal(false);

  // Form fields
  rating = signal<number>(0);
  comment = signal<string>('');
  hoverRating = signal<number>(0);

  ratingLabels: Record<number, string> = {
    1: 'Poor',
    2: 'Fair',
    3: 'Good',
    4: 'Very Good',
    5: 'Excellent'
  };

  /** Whether the user can actively interact with the rating/form */
  canEdit = computed(() => !this.existingFeedback() || this.isEditing());

  /** Detection if any modifications were made compared to the existing record */
  isFormChanged = computed(() => {
    const original = this.existingFeedback();
    if (!original) return true; // New entries are always considered "changed"
    return this.rating() !== original.rating || this.comment().trim() !== (original.comment || '').trim();
  });

  constructor() {
    effect(() => {
      const id = this.analysisId();
      if (id) {
        untracked(() => this.loadFeedback());
      }
    });
  }

  ngOnInit() {
  }

  loadFeedback() {
    this.isLoading.set(true);
    // Reset local state for fresh start
    this.existingFeedback.set(null);
    this.rating.set(0);
    this.comment.set('');
    this.isEditing.set(false);

    // 1. Check Cache First
    const cached = this.feedbackService.getCachedAnalysisFeedback(this.analysisId());
    if (cached) {
      this.existingFeedback.set(cached);
      this.rating.set(cached.rating);
      this.comment.set(cached.comment || '');
      this.isLoading.set(false);
    }

    // 2. Refresh from API
    this.feedbackService.getAnalysisFeedback(this.analysisId())
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (response) => {
          if (response.is_success) {
            if (response.data) {
              this.existingFeedback.set(response.data);
              this.rating.set(response.data.rating);
              this.comment.set(response.data.comment || '');
              this.feedbackService.cacheAnalysisFeedback(response.data);
            } else {
              // No feedback found (graceful null)
              this.existingFeedback.set(null);
              this.feedbackService.removeCachedAnalysisFeedback(this.analysisId());
            }
          }
        },
        error: (err) => {
          this.toastService.show('Load Error', 'Failed to sync feedback information.', 'error', 'error');
          this.isLoading.set(false);
        }
      });
  }

  setRating(value: number) {
    if (this.existingFeedback() && !this.isEditing()) return;
    this.rating.set(value);
  }

  submitFeedback() {
    if (this.rating() === 0) {
      this.toastService.show('Rating Required', 'Please select a rating before submitting.', 'error', 'error');
      return;
    }

    this.isSubmitting.set(true);

    const request: AnalysisFeedbackRequest = {
      analysis_id: this.analysisId(),
      rating: this.rating(),
      comment: this.comment().trim() || undefined
    };

    this.feedbackService.submitAnalysisFeedback(request)
      .pipe(finalize(() => this.isSubmitting.set(false)))
      .subscribe({
        next: (response) => {
          if (response.is_success) {
            this.existingFeedback.set(response.data);
            this.isEditing.set(false);
            this.feedbackService.cacheAnalysisFeedback(response.data);
          } else {
            this.toastService.show('Submission Error', response.message || 'Failed to submit feedback.', 'error', 'error');
          }
        },
        error: (err) => {
          this.toastService.show('Error', err.error?.message || 'A conflict or error occurred while saving your feedback.', 'error', 'error');
        }
      });
  }

  onDeleteClick() {
    const feedback = this.existingFeedback();
    if (!feedback) return;

    this.toastService.confirm(
      'Delete Feedback',
      'Are you sure you want to remove this review? This action cannot be undone.',
      () => this.deleteFeedback(),
      {
        icon: 'trash',
        type: 'error',
        confirmLabel: 'Delete'
      }
    );
  }

  private deleteFeedback() {
    this.isSubmitting.set(true);
    this.feedbackService.deleteFeedback(this.analysisId())
      .pipe(finalize(() => this.isSubmitting.set(false)))
      .subscribe({
        next: (response) => {
          if (response.is_success) {
            this.toastService.show('Feedback Deleted', 'Your review has been successfully removed.', 'info', 'check');
            this.feedbackService.removeCachedAnalysisFeedback(this.analysisId());
            this.existingFeedback.set(null);
            this.rating.set(0);
            this.comment.set('');
            this.isEditing.set(false);
          }
        },
        error: () => {
          this.toastService.show('Error', 'Failed to delete feedback. Please try again.', 'error');
        }
      });
  }

  startEditing() {
    this.isEditing.set(true);
  }

  cancelEditing() {
    const feedback = this.existingFeedback();
    if (feedback) {
      this.rating.set(feedback.rating);
      this.comment.set(feedback.comment || '');
    }
    this.isEditing.set(false);
  }
}
