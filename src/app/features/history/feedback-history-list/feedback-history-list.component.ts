import { Component, inject, signal, computed, input, effect, untracked, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FeedbackService } from '../../../core/services/feedback.service';
import { ToastService } from '../../../core/services/toast.service';
import { AnalysisStorageService } from '../../../core/services/analysis-storage.service';
import { UnifiedFeedbackItem, ModerationStatus } from '../../../core/models/feedback.model';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { LoadingStateComponent } from '../../../shared/components/loading-state/loading-state.component';
import { SystemFeedbackUIService } from '../../../core/services/system-feedback-ui.service';
import { AppIconComponent } from '../../../shared/components/app-icon/app-icon.component';
import { FormattingService } from '../../../core/services/formatting.service';
import { AppCacheService } from '../../../core/services/app-cache.service';
import { finalize } from 'rxjs';
import { LoadMoreComponent } from '../../../shared/components/load-more/load-more.component';

export interface FeedbackListItem {
  id: number;
  feedbackType: 'analysis' | 'system';
  analysisId: string | number | null;
  rating: number;
  comment: string | null;
  isPublic: boolean | null;
  moderationStatus: ModerationStatus | null;
  createdAt: string;
  formattedDate: string;
  // Resolved from local sessions or history
  analysisType: 'text' | 'audio' | 'image' | 'video' | null;
  title: string;
}

@Component({
  selector: 'app-feedback-history-list',
  standalone: true,
  imports: [CommonModule, EmptyStateComponent, LoadingStateComponent, AppIconComponent, LoadMoreComponent],
  templateUrl: './feedback-history-list.component.html',
  styleUrl: './feedback-history-list.component.css'
})
export class FeedbackHistoryListComponent {
  private feedbackService = inject(FeedbackService);
  private storageService = inject(AnalysisStorageService);
  private toastService = inject(ToastService);
  private uiService = inject(SystemFeedbackUIService);
  private router = inject(Router);
  protected format = inject(FormattingService);
  private cache = inject(AppCacheService);
  private destroyRef = inject(DestroyRef);

  private readonly CACHE_KEY = 'emotra_feedback_history';

  // State
  isLoading = signal(true);
  isLoadingMore = signal<boolean>(false);
  hasError = signal(false);
  allItems = signal<FeedbackListItem[]>([]);
  totalCount = signal<number>(0);
  currentPage = signal<number>(1);
  readonly pageSize = 10;

  // Inputs from parent history page
  searchQuery = input<string>('');
  sortOrder = input<string>('newest');
  analysisHistory = input<any[]>([]); // New input to help resolve numeric IDs from server data

  // Helper for star rendering
  stars = [1, 2, 3, 4, 5];

  // Filtered + sorted list (now purely server-side, this returns direct list)
  visibleItems = computed(() => this.allItems());

  filteredCount = computed(() => this.totalCount());

  canLoadMore = computed(() => this.allItems().length < this.totalCount());
  remainingCount = computed(() => this.totalCount() - this.allItems().length);

  constructor() {
    // 1. React to search query and sort order changes from parent
    effect(() => {
      const search = this.searchQuery();
      const sort = this.sortOrder();
      untracked(() => {
        this.currentPage.set(1);
        this.loadFeedback(false, 1);
      });
    });

    // 3. Listen for INSTANT updates from the modal to provide "zero-latency" UI
    this.uiService.feedbackUpdated$
      .pipe(takeUntilDestroyed())
      .subscribe(updated => {
        this.allItems.update(items => {
          const index = items.findIndex(i => i.feedbackType === 'system');
          if (index !== -1) {
            const newItems = [...items];
            newItems[index] = {
              ...newItems[index],
              rating: updated.rating,
              comment: updated.comment || '',
              isPublic: updated.is_public ?? true,
              moderationStatus: updated.moderation_status || 'Pending',
              createdAt: updated.created_at,
              formattedDate: this.format.formatDate(updated.created_at)
            };
            return newItems;
          }
          return items;
        });
      });
  }

  loadFeedback(isSilent: boolean = false, page: number = 1) {
    this.hasError.set(false);
    const isFirstPage = page === 1;
    const hasSearch = this.searchQuery().trim() !== '';
    const cacheKey = `${this.CACHE_KEY}_${this.sortOrder()}`;

    if (!isSilent) {
      if (isFirstPage) {
        const cached = this.cache.getItem<any>(cacheKey);
        if (cached && !hasSearch) {
          this.allItems.set(cached.data || []);
          this.totalCount.set(cached.total || 0);
          this.isLoading.set(false);
        } else {
          this.allItems.set([]);
          this.isLoading.set(true);
        }
      } else {
        this.isLoadingMore.set(true);
      }
    }

    const pageToRequest = page;
    const limit = this.pageSize;

    this.feedbackService.getMyFeedbackHistory(
      pageToRequest,
      limit,
      this.searchQuery().trim() || undefined,
      this.sortOrder()
    )
      .pipe(finalize(() => {
        if (!isSilent) {
          this.isLoading.set(false);
          this.isLoadingMore.set(false);
        }
      }))
      .subscribe({
        next: (response: any) => {
          if (response.is_success && response.data) {
            const items = response.data as UnifiedFeedbackItem[];
            const mappedItems = this.mapToListItems(items);

            this.totalCount.set(response.total || mappedItems.length);
            if (isFirstPage) {
              this.allItems.set(mappedItems);
            } else {
              this.allItems.update(current => [...current, ...mappedItems]);
            }
            this.currentPage.set(page);

            // Update cache (only cache page 1 for initial rehydration when no search active)
            if (isFirstPage && !hasSearch) {
              this.cache.setItem(cacheKey, {
                data: mappedItems,
                total: response.total
              });
            }

            // Update individual caches for context consistency
            items.filter(f => f.feedback_type === 'analysis' && f.analysis_id).forEach(f => {
              this.feedbackService.cacheAnalysisFeedback({
                id: f.id,
                analysis_id: f.analysis_id!,
                rating: f.rating,
                comment: f.comment,
                created_at: f.created_at
              });
            });

            const systemEntry = items.find(f => f.feedback_type === 'system');
            if (systemEntry) {
              this.feedbackService.cacheSystemFeedback({
                id: systemEntry.id,
                rating: systemEntry.rating,
                comment: systemEntry.comment || '',
                is_public: systemEntry.is_public ?? true,
                moderation_status: systemEntry.moderation_status,
                created_at: systemEntry.created_at
              });
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

  loadMore() {
    if (this.isLoadingMore()) return;
    this.currentPage.update(p => p + 1);
    this.loadFeedback(false, this.currentPage());
  }

  retry() {
    this.isLoading.set(true);
    this.hasError.set(false);
    this.loadFeedback(false, this.currentPage());
  }

  navigateToAnalysis(item: FeedbackListItem) {
    if (item.feedbackType === 'analysis' && item.analysisId) {
      const type = (item.analysisType || 'text').toLowerCase();

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
              this.cache.setItem(this.CACHE_KEY, {
                data: newItems,
                total: this.totalCount()
              });
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
      let analysisType: 'text' | 'audio' | 'image' | 'video' | null = f.analysis_type
        ? (f.analysis_type.toLowerCase() as any)
        : null;

      if (f.feedback_type === 'analysis' && f.analysis_id) {
        // Search in all session types for a match to get metadata like titles
        const textSession = this.storageService.getSessions().find(s => s.id === f.analysis_id || s.cloudId === Number(f.analysis_id));
        const audioSession = this.storageService.getAudioSessions().find(s => s.id === f.analysis_id || s.cloudId === Number(f.analysis_id));
        const imageSession = this.storageService.getImageSessions().find(s => s.id === f.analysis_id || s.cloudId === Number(f.analysis_id));
        const videoSession = this.storageService.getVideoSessions().find(s => s.id === f.analysis_id || s.cloudId === Number(f.analysis_id));

        // Also search in passed history list
        const historyItem = this.analysisHistory().find(h => h.client_id === f.analysis_id || h.id === Number(f.analysis_id));

        const session = textSession || audioSession || imageSession || videoSession;

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
          title = this.format.truncate(rawTitle, 60);
        }
      }

      return {
        id: f.id,
        feedbackType: f.feedback_type,
        analysisId: f.analysis_id,
        rating: f.rating,
        comment: f.comment,
        isPublic: f.is_public,
        moderationStatus: f.moderation_status,
        createdAt: f.created_at,
        formattedDate: this.format.formatDate(f.created_at),
        analysisType,
        title
      };
    });
  }



  private rehydrateFromCache() {
    const parsed = this.cache.getItem<any>(this.CACHE_KEY);
    if (parsed?.data) {
      this.allItems.set(parsed.data);
      this.totalCount.set(parsed.total || parsed.data.length);
      this.isLoading.set(false);
    }
  }
}
