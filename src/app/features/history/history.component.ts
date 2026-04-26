import { Component, signal, inject, OnInit, computed, HostListener, effect, untracked, DestroyRef, ViewChild, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AnalysisV2Service } from '../../core/services/analysis-v2.service';
import { EmotionIconComponent } from '../../shared/components/emotion-icon/emotion-icon.component';
import { FooterSectionComponent } from '../../shared/components/footer/footer.component';
import { ToastService } from '../../core/services/toast.service';
import { PageHeaderComponent } from '../../shared/components/layout/page-header/page-header.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { SegmentedNavComponent } from '../../shared/components/segmented-nav/segmented-nav.component';
import { LoadingStateComponent } from '../../shared/components/loading-state/loading-state.component';
import { FeedbackHistoryListComponent } from './feedback-history-list/feedback-history-list.component';
import { DropdownMenuComponent, DropdownOption } from '../../shared/components/dropdown-menu/dropdown-menu.component';
import { AnalysisHistoryItem, AnalysisType } from '../../core/models/analysis-v2.model';
import { AlertsService } from '../../core/services/alerts.service';

type FilterType = 'all' | 'text' | 'audio' | 'feedback';
type SortOrder = 'newest' | 'oldest';

const HISTORY_STATE_KEY = 'emotra_history_state';

interface HistoryPersistedState {
  type: FilterType;
  search: string;
  sort: SortOrder;
}

@Component({
  selector: 'app-history',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, EmotionIconComponent, FooterSectionComponent, PageHeaderComponent, EmptyStateComponent, SegmentedNavComponent, LoadingStateComponent, DropdownMenuComponent, FeedbackHistoryListComponent],
  templateUrl: './app-history.html',
  styleUrls: ['./app-history.css']
})
export class HistoryComponent implements OnInit {

  private analysisV2Service = inject(AnalysisV2Service);
  private alertsService = inject(AlertsService);
  private toastService = inject(ToastService);
  private destroyRef = inject(DestroyRef);

  // Filters
  typeOptions = [
    { label: 'All Tracks', value: 'all' },
    { label: 'Text', value: 'text' },
    { label: 'Audio', value: 'audio' },
    { label: 'Feedback', value: 'feedback' }
  ];
  filterType = signal<FilterType>('all');
  searchQuery = signal<string>('');
  sortOrder = signal<SortOrder>('newest');

  sortOptions: DropdownOption[] = [
    { label: 'Newest First', value: 'newest' },
    { label: 'Oldest First', value: 'oldest' },
  ];

  isMobile = signal<boolean>(false);
  isSortOpen = signal<boolean>(false);

  // Backend state
  private currentPage = signal<number>(1);
  private _serverTotal = signal<number>(0);
  private _loadedItems = signal<AnalysisHistoryItem[]>([]);
  hasAnyHistory = signal<boolean>(false);

  isLoading = signal<boolean>(true);
  isLoadingMore = signal<boolean>(false);

  // Check feedback cache silently
  private hasFeedbackCache = signal<boolean>(this.checkFeedbackCache());

  private checkFeedbackCache(): boolean {
    try {
      // 1. Check history list cache
      const historyCached = localStorage.getItem('emotra_feedback_history');
      if (historyCached) {
        const parsed = JSON.parse(historyCached);
        if (parsed.total > 0 || (parsed.data && parsed.data.length > 0)) return true;
      }

      // 2. Check system feedback cache
      const systemCached = localStorage.getItem('emotra_system_feedback');
      if (systemCached) {
        const parsed = JSON.parse(systemCached);
        if (parsed) return true;
      }
    } catch { }
    return false;
  }

  // Derived arrays mapping to what HTML expects without touching HTML
  allSessions = computed(() => {
    // Used by HTML just to check if total > 0 via length
    return new Array(this._serverTotal());
  });

  hasAnyData = computed(() => this.hasAnyHistory() || this.hasFeedbackCache());
  isWholeHistoryEmpty = computed(() => !this.hasAnyHistory() && !this.hasFeedbackCache());

  showFilters = computed(() => {
    // Show filters if we have any data at all, or if currently searching/tab-switched
    return this.hasAnyData() || this.filterType() !== 'all' || this.searchQuery().trim() !== '';
  });

  filteredCount = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    if (q) return this.visibleSessions().length;
    return this._serverTotal();
  });

  enhancedSessions = computed(() => {
    // HTML uses this length for 'Load X More Logs' calculations
    const q = this.searchQuery().toLowerCase().trim();
    if (q) {
      const unloaded = Math.max(0, this._serverTotal() - this._loadedItems().length);
      return new Array(this.visibleSessions().length + unloaded) as unknown[];
    }
    return new Array(this._serverTotal()) as unknown[];
  });

  visibleSessions = computed(() => {
    let list = [...this._loadedItems()];

    // Maintain search and sort behaviors client-side on loaded chunk to not break features
    const q = this.searchQuery().toLowerCase().trim();
    if (q) {
      list = list.filter(item => {
        const inputStr = item.summary_text || '';
        const emotion = item.dominant_emotion?.toLowerCase() || '';
        return inputStr.toLowerCase().includes(q) || emotion.includes(q);
      });
    }

    list.sort((a, b) => {
      const timeA = new Date(a.timestamp).getTime();
      const timeB = new Date(b.timestamp).getTime();
      return this.sortOrder() === 'newest' ? timeB - timeA : timeA - timeB;
    });

    return list.map(s => {
      const rawCat = s.emotion_category?.toLowerCase() || 'neutral';
      const safeCategory = rawCat === 'natural' ? 'neutral' : rawCat;

      return {
        id: s.id,
        clientId: s.client_id || s.id,
        type: s.type.toLowerCase(),
        metadata: {
          dominantLabel: s.dominant_emotion,
          dominantCategory: safeCategory,
          emotionColor: this.calculateEmotionColor(s.dominant_emotion),
          icon: s.type.toLowerCase() === 'text' ? 'document-text' : 'microphone',
          formattedDate: this.formatDate(s.timestamp),
          title: s.summary_text || 'Analysis Result',
          confidence: s.confidence_percent
        }
      };
    });
  });

  // Component Refs
  private feedbackList = viewChild<FeedbackHistoryListComponent>('feedbackList');

  // Computed state for the header stats to avoid NG0100 errors
  // by wrapping child property access in a stable reactive chain
  currentCount = computed(() => {
    const list = this.feedbackList();
    if (this.filterType() === 'feedback') {
      return list?.filteredCount() ?? 0;
    }
    return this._serverTotal();
  });

  constructor() {
    // 1. Restore state from previous session if exists
    this.rehydrateFromSession();

    // 2. Automatically refetch when filter type changes
    effect(() => {
      const type = this.filterType();
      untracked(() => {
        if (type === 'feedback') return; // Feedback tab has its own component
        this.currentPage.set(1);
        this.fetchPage();
      });
    });

    // 3. Persist state changes back to session storage
    effect(() => {
      this.persistState();
    });
  }

  ngOnInit() {
    this.isMobile.set(window.innerWidth < 640);
  }

  @HostListener('window:resize')
  onResize() {
    this.isMobile.set(window.innerWidth < 640);
  }

  fetchPage() {
    const isFirstPage = this.currentPage() === 1;
    const cacheKey = `emotra_history_meta_${this.filterType()}`;

    if (isFirstPage) {
      try {
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          const parsed = JSON.parse(cached);
          const totalCount = parsed.total || 0;
          this._serverTotal.set(totalCount);

          if (totalCount > 0) {
            this.hasAnyHistory.set(true);
          } else if (this.filterType() === 'all' && !this.searchQuery().trim()) {
            this.hasAnyHistory.set(false);
          }

          if (parsed.data) {
            this._loadedItems.set(parsed.data);
          }
          this.isLoading.set(false); // Skip initial spinner
        } else {
          this.isLoading.set(true);
        }
      } catch (e) {
        this.isLoading.set(true);
      }
    } else {
      this.isLoadingMore.set(true);
    }

    const typeStr = this.filterType() === 'all' ? undefined : this.filterType();
    const capitalizedType = typeStr ? (typeStr.charAt(0).toUpperCase() + typeStr.slice(1)) as AnalysisType : undefined;

    this.analysisV2Service.getHistory(this.currentPage(), 10, capitalizedType)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          if (res.is_success) {
            const totalCount = res.total || 0;
            this._serverTotal.set(totalCount);

            // Update global history state: if we see items, definitely has history. 
            // If we see 0 items on 'All' view with no search, then history is truly empty.
            if (totalCount > 0) {
              this.hasAnyHistory.set(true);
            } else if (this.filterType() === 'all' && !this.searchQuery().trim()) {
              this.hasAnyHistory.set(false);
            }

            if (res.data) {
              if (isFirstPage) {
                this._loadedItems.set(res.data);
                try {
                  localStorage.setItem(cacheKey, JSON.stringify({ data: res.data, total: totalCount }));
                } catch (e) {
                  console.warn('Failed to cache history', e);
                }
              } else {
                this._loadedItems.update(arr => [...arr, ...res.data!]);
              }
            }
          }
          this.isLoading.set(false);
          this.isLoadingMore.set(false);
        },
        error: (err) => {
          this.isLoading.set(false);
          this.isLoadingMore.set(false);
          // No toast on page load
        }
      });
  }

  loadMore() {
    this.currentPage.update(p => p + 1);
    this.fetchPage();
  }

  /** Centralized refresh logic that respects the current tab */
  refreshHistory() {
    this.searchQuery.set('');
    this.sortOrder.set('newest');

    // If not in feedback, do a full reset to 'all' and refetch
    if (this.filterType() !== 'feedback') {
      this.filterType.set('all');
      this.currentPage.set(1);
      this.fetchPage();
    }
  }


  calculateEmotionColor(label: string): string {
    const l = label?.toLowerCase() || 'neutral';
    if (l === 'positive') return 'var(--color-success)';
    if (l === 'negative') return 'var(--color-danger)';
    return `var(--emotion-${l})`;
  }

  deleteSession(clientId: string) {
    this.toastService.confirm(
      'Delete Session',
      'Are you sure you want to permanently remove this history item?',
      () => {
        this.analysisV2Service.deleteAnalysis(clientId)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: (res) => {
              if (res.is_success) {
                this.toastService.show('Deleted', 'Session has been removed successfully', 'success', 'check');

                // 1. Update UI immediately
                const deletedItem = this._loadedItems().find(i => i.client_id === clientId || i.id === Number(clientId));
                if (deletedItem) {
                  this._loadedItems.update(items => items.filter(i => i.id !== deletedItem.id));
                }

                this._serverTotal.update(t => {
                  const newTotal = Math.max(0, t - 1);
                  if (this.filterType() === 'all' && !this.searchQuery().trim() && newTotal === 0) {
                    this.hasAnyHistory.set(false);
                  }
                  return newTotal;
                });

                // 2. Clear caches
                if (deletedItem) {
                  this.invalidateCacheOnDelete(deletedItem);
                }

                // 3. Sync alert stats (deletion on backend removes related alerts)
                this.alertsService.fetchStats();
              } else {
                this.toastService.show('Error', res.message || 'Failed to delete record', 'error', 'error');
              }
            },
            error: () => this.toastService.show('Error', 'Failed to delete record', 'error', 'error')
          });
      },
      {
        icon: 'trash',
        type: 'error',
        confirmLabel: 'Delete'
      }
    );
  }

  deleteAllLogs() {
    this.toastService.confirm(
      'Permanent Wipe',
      'This will delete EVERY session in your history. This action is irreversible.',
      () => {
        this.analysisV2Service.clearHistory()
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: (res) => {
              if (res.is_success) {
                // 1. Update UI
                this._loadedItems.set([]);
                this._serverTotal.set(0);
                this.hasAnyHistory.set(false);

                // 2. Wipe ALL relevant caches
                this.wipeAllCaches();

                // 3. Reset alert stats
                this.alertsService.fetchStats();

                this.toastService.show('History Cleared', 'All logs have been permanently removed', 'success', 'trash');
              } else {
                this.toastService.show('Error', res.message || 'Failed to clear history', 'error', 'error');
              }
            },
            error: () => this.toastService.show('Error', 'Failed to clear history', 'error', 'error')
          });
      },
      {
        icon: 'warning',
        type: 'error',
        confirmLabel: 'Wipe Everything',
        requireInput: true,
        expectedValue: 'DELETE'
      }
    );
  }

  private invalidateCacheOnDelete(item: AnalysisHistoryItem) {
    try {
      const cloudId = item.id;
      const clientId = item.client_id;

      // 1. Basic history meta
      localStorage.removeItem('emotra_history_meta_all');
      localStorage.removeItem('emotra_history_meta_text');
      localStorage.removeItem('emotra_history_meta_audio');
      localStorage.removeItem('emotra_stats');
      localStorage.removeItem(`emotra_analysis_detail_${cloudId}`);

      // 2. Cleanup emotra_feedback (UUID lookup)
      const feedbackCache = localStorage.getItem('emotra_feedback');
      if (feedbackCache && clientId) {
        const feedback = JSON.parse(feedbackCache);
        if (feedback[clientId]) {
          delete feedback[clientId];
          localStorage.setItem('emotra_feedback', JSON.stringify(feedback));
        }
      }

      // 3. Cleanup feedback history list (Numeric ID lookup)
      const feedHistory = localStorage.getItem('emotra_feedback_history');
      if (feedHistory) {
        const parsed = JSON.parse(feedHistory);
        if (parsed.data) {
          const originalLen = parsed.data.length;
          parsed.data = parsed.data.filter((f: any) =>
            f.analysisId !== clientId &&
            Number(f.analysisId) !== cloudId &&
            f.id !== cloudId // just in case
          );
          if (parsed.data.length !== originalLen) {
            parsed.total = Math.max(0, (parsed.total || originalLen) - (originalLen - parsed.data.length));
            localStorage.setItem('emotra_feedback_history', JSON.stringify(parsed));
          }
        }
      }

      // 4. Cleanup alerts meta (list of alerts)
      const alertsMeta = localStorage.getItem('emotra_alerts_meta');
      if (alertsMeta) {
        let alerts = JSON.parse(alertsMeta);
        const originalLen = alerts.length;
        alerts = alerts.filter((a: any) => a.analysis_v2_id !== cloudId && a.client_id !== clientId);
        if (alerts.length !== originalLen) {
          localStorage.setItem('emotra_alerts_meta', JSON.stringify(alerts));
        }
      }

    } catch (e) {
      console.warn('Failed to partial wipe caches', e);
    }
  }

  private wipeAllCaches() {
    try {
      const keysToClear = [
        'emotra_history_meta_all',
        'emotra_history_meta_text',
        'emotra_history_meta_audio',
        'emotra_stats',
        'emotra_text_sessions',
        'emotra_audio_sessions',
        'emotra_feedback',
        'emotra_feedback_history',
        'emotra_system_feedback',
        'emotra_alerts_meta',
        'emotra_alerts_stats'
      ];
      keysToClear.forEach(k => localStorage.removeItem(k));

      // Clear all detailed analysis keys
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('emotra_analysis_detail_')) {
          localStorage.removeItem(key);
          i--; // Adjust index after removal
        }
      }
    } catch (e) { }
  }

  formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString(undefined, {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  }

  private persistState() {
    try {
      const state: HistoryPersistedState = {
        type: this.filterType(),
        search: this.searchQuery(),
        sort: this.sortOrder()
      };
      sessionStorage.setItem(HISTORY_STATE_KEY, JSON.stringify(state));
    } catch (e) { }
  }

  private rehydrateFromSession() {
    try {
      const raw = sessionStorage.getItem(HISTORY_STATE_KEY);
      if (!raw) return;

      const saved: HistoryPersistedState = JSON.parse(raw);
      if (saved.type) this.filterType.set(saved.type);
      if (saved.search !== undefined) this.searchQuery.set(saved.search);
      if (saved.sort) this.sortOrder.set(saved.sort);
    } catch (e) { }
  }
}
