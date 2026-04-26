import { Component, inject, signal, computed, input, OnInit, effect, untracked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FeedbackService } from '../../../core/services/feedback.service';
import { ToastService } from '../../../core/services/toast.service';
import { AnalysisStorageService } from '../../../core/services/analysis-storage.service';
import { UnifiedFeedbackItem } from '../../../core/models/feedback.model';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { LoadingStateComponent } from '../../../shared/components/loading-state/loading-state.component';
import { SystemFeedbackUIService } from '../../../core/services/system-feedback-ui.service';
import { finalize } from 'rxjs';

export interface FeedbackListItem {
  id: number;
  feedbackType: 'analysis' | 'system';
  analysisId: string | number | null;
  rating: number;
  comment: string | null;
  isPublic: boolean | null;
  createdAt: string;
  formattedDate: string;
  // Resolved from local sessions or history
  analysisType: 'text' | 'audio' | null;
  title: string;
}

@Component({
  selector: 'app-feedback-history-list',
  standalone: true,
  imports: [CommonModule, EmptyStateComponent, LoadingStateComponent],
  templateUrl: './feedback-history-list.component.html',
  styleUrl: './feedback-history-list.component.css'
})
export class FeedbackHistoryListComponent implements OnInit {
  private feedbackService = inject(FeedbackService);
  private storageService = inject(AnalysisStorageService);
  private toastService = inject(ToastService);
  private uiService = inject(SystemFeedbackUIService);
  private router = inject(Router);

  private readonly CACHE_KEY = 'emotra_feedback_history';

  // Initial rehydration logic to prevent ANY flicker
  private getCachedData() {
    try {
      const cached = localStorage.getItem(this.CACHE_KEY);
      if (cached) return JSON.parse(cached);
    } catch { }
    return null;
  }

  // State initialized from cache instantly
  private initialCache = this.getCachedData();
  isLoading = signal(!this.initialCache);
  hasError = signal(false);
  allItems = signal<FeedbackListItem[]>(this.initialCache?.data || []);
  totalCount = signal(this.initialCache?.total || this.initialCache?.data?.length || 0);

  // Inputs from parent history page
  searchQuery = input<string>('');
  sortOrder = input<string>('newest');
  analysisHistory = input<any[]>([]); // New input to help resolve numeric IDs from server data

  // Helper for star rendering
  stars = [1, 2, 3, 4, 5];

  // Filtered + sorted list
  visibleItems = computed(() => {
    let list = [...this.allItems()];

    // Search
    const q = this.searchQuery().toLowerCase().trim();
    if (q) {
      list = list.filter(item => {
        const title = item.title.toLowerCase();
        const comment = (item.comment || '').toLowerCase();
        const type = item.feedbackType.toLowerCase();
        return title.includes(q) || comment.includes(q) || type.includes(q);
      });
    }

    // Sort
    list.sort((a, b) => {
      const timeA = new Date(a.createdAt).getTime();
      const timeB = new Date(b.createdAt).getTime();
      return this.sortOrder() === 'newest' ? timeB - timeA : timeA - timeB;
    });

    return list;
  });

  filteredCount = computed(() => this.visibleItems().length);

  constructor() {
    // Refresh list in background when feedback modal is closed 
    effect(() => {
      const isOpen = this.uiService.isOpen();
      untracked(() => {
        if (!isOpen) {
          this.loadFeedback(true); // silent refresh
        }
      });
    });
  }

  ngOnInit() {
    this.loadFeedback();
  }

  loadFeedback(isSilent: boolean = false) {
    this.hasError.set(false);

    // If we don't even have cache items, we must show a primary loader
    if (!this.allItems().length && !isSilent) {
      this.isLoading.set(true);
    }

    this.feedbackService.getMyFeedbackHistory(1, 50)
      .pipe(finalize(() => !isSilent && this.isLoading.set(false)))
      .subscribe({
        next: (response: any) => {
          if (response.is_success && response.data) {
            const items = response.data as UnifiedFeedbackItem[];
            const mappedItems = this.mapToListItems(items);

            this.totalCount.set(response.total || mappedItems.length);
            this.allItems.set(mappedItems);

            // Update localStorage
            try {
              localStorage.setItem(this.CACHE_KEY, JSON.stringify({
                data: mappedItems,
                total: response.total
              }));
            } catch (e) { }

            // Update individual caches for context consistency
            items.filter(f => f.feedback_type === 'analysis' && f.analysis_id).forEach(f => {
              this.feedbackService.cacheAnalysisFeedback({
                id: f.id,
                analysis_id: f.analysis_id,
                rating: f.rating,
                comment: f.comment,
                created_at: f.created_at
              });
            });

            const systemEntry = items.find(f => f.feedback_type === 'system');
            if (systemEntry) {
              this.feedbackService.cacheSystemFeedback(systemEntry);
            }
          }
        },
        error: () => {
          if (this.allItems().length === 0) {
            this.hasError.set(true);
          }
        }
      });
  }

  retry() {
    this.isLoading.set(true);
    this.hasError.set(false);
    this.loadFeedback();
  }

  navigateToAnalysis(item: FeedbackListItem) {
    if (item.feedbackType === 'analysis' && item.analysisId) {
      const type = item.analysisType || 'text';

      // We now use the UUID (client_id) directly
      const finalId = item.analysisId;

      this.router.navigate(['/analysis', type, finalId], {
        state: { scrollToFeedback: true }
      });
    }
  }

  editSystemFeedback() {
    this.uiService.open();
  }

  deleteItem(item: FeedbackListItem, event: Event) {
    event.stopPropagation();

    const isAnalysis = item.feedbackType === 'analysis';
    const title = isAnalysis ? 'Delete Analysis Feedback' : 'Delete System Feedback';
    const message = isAnalysis
      ? 'Are you sure you want to remove this analysis review?'
      : 'Are you sure you want to remove your platform review?';

    this.toastService.confirm(title, message, () => {
      if (isAnalysis && item.analysisId) {
        this.feedbackService.deleteFeedback(item.analysisId.toString()).subscribe({
          next: (res) => {
            if (res.is_success) {
              this.toastService.show('Deleted', 'Feedback removed successfully.', 'success', 'check');
              this.feedbackService.removeCachedAnalysisFeedback(item.analysisId!.toString());

              const newItems = this.allItems().filter(i => i.id !== item.id);
              this.allItems.set(newItems);
              this.totalCount.update(t => Math.max(0, t - 1));

              // Sync cache immediately for "instant" feel
              try {
                localStorage.setItem(this.CACHE_KEY, JSON.stringify({
                  data: newItems,
                  total: this.totalCount()
                }));
              } catch (e) { }
            }
          },
          error: () => this.toastService.show('Error', 'Failed to delete feedback.', 'error', 'error')
        });
      }
      // System feedback deletion is not supported by the API (upsert only)
    }, {
      icon: 'trash',
      type: 'error',
      confirmLabel: 'Delete'
    });
  }

  private mapToListItems(entries: UnifiedFeedbackItem[]): FeedbackListItem[] {
    const allSessions = this.storageService.allSessions();

    return entries.map(f => {
      let title = f.feedback_type === 'system' ? 'Platform Experience' : 'Analysis Review';
      let analysisType: 'text' | 'audio' | null = f.analysis_type || null;

      if (f.feedback_type === 'analysis' && f.analysis_id) {
        // Search in all session types for a match to get metadata like titles
        const textSession = this.storageService.getSessions().find(s => s.id === f.analysis_id || s.cloudId === Number(f.analysis_id));
        const audioSession = this.storageService.getAudioSessions().find(s => s.id === f.analysis_id || s.cloudId === Number(f.analysis_id));

        // Also search in passed history list
        const historyItem = this.analysisHistory().find(h => h.client_id === f.analysis_id || h.id === Number(f.analysis_id));

        const session = textSession || audioSession;

        // If we don't have analysisType from server yet, fall back to resolved type
        if (!analysisType && (session || historyItem)) {
          analysisType = (session?.type as any) || (historyItem?.type?.toLowerCase() as any) || 'text';
        }

        if (session || historyItem) {
          const rawTitle = (session as any)?.originalText
            || (session as any)?.original_text
            || (session as any)?.inputFileName
            || (session as any)?.file_name
            || (historyItem as any)?.summary_text
            || '';
          title = rawTitle.length > 60 ? rawTitle.substring(0, 60) + '…' : rawTitle;
        }
      }

      return {
        id: f.id,
        feedbackType: f.feedback_type,
        analysisId: f.analysis_id,
        rating: f.rating,
        comment: f.comment,
        isPublic: f.is_public,
        createdAt: f.created_at,
        formattedDate: this.formatDate(f.created_at),
        analysisType,
        title
      };
    });
  }

  private formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString(undefined, {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  }

  private rehydrateFromCache() {
    try {
      const cached = localStorage.getItem(this.CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed.data) {
          this.allItems.set(parsed.data);
          this.totalCount.set(parsed.total || parsed.data.length);
          this.isLoading.set(false);
        }
      }
    } catch (e) { }
  }
}
