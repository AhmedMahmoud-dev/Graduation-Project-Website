import { Component, signal, inject, OnInit, computed, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AlertService } from '../../core/services/alert.service';
import { AlertsService } from '../../core/services/alerts.service';
import { AnalysisV2Service } from '../../core/services/analysis-v2.service';
import { AnalysisStorageService } from '../../core/services/analysis-storage.service';
import { ToastService } from '../../core/services/toast.service';
import { FormattingService } from '../../core/services/formatting.service';
import { AppCacheService } from '../../core/services/app-cache.service';
import { AlertItem, AlertStats } from '../../core/models/alert.model';
import { AnalysisSession, AudioAnalysisSession } from '../../core/models/text-analysis.model';
import { PageHeaderComponent } from '../../shared/components/layout/page-header/page-header.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { DropdownMenuComponent, DropdownOption } from '../../shared/components/dropdown-menu/dropdown-menu.component';
import { FooterSectionComponent } from '../../shared/components/footer/footer.component';
import { LoadingStateComponent } from '../../shared/components/loading-state/loading-state.component';
import { AppIconComponent } from "../../shared/components/app-icon/app-icon.component";

@Component({
  selector: 'app-alerts',
  standalone: true,
  imports: [CommonModule, FormsModule, PageHeaderComponent, EmptyStateComponent, DropdownMenuComponent, FooterSectionComponent, LoadingStateComponent, AppIconComponent],
  templateUrl: './alerts.component.html',
  styleUrl: './alerts.component.css'
})
export class AlertsComponent implements OnInit {
  private alertService = inject(AlertService);
  private alertsService = inject(AlertsService);
  private analysisV2Service = inject(AnalysisV2Service);
  private storageService = inject(AnalysisStorageService);
  private toastService = inject(ToastService);
  private router = inject(Router);
  protected format = inject(FormattingService);
  private cache = inject(AppCacheService);
  private destroyRef = inject(DestroyRef);

  // UI State
  isLoading = signal<boolean>(true);
  isLoadingMore = signal<boolean>(false);
  isResolving = signal<number | null>(null);

  // Filters
  searchQuery = signal<string>('');
  severityFilter = signal<'all' | 'critical' | 'high' | 'medium' | 'low' | 'support'>('all');
  hideRead = signal<boolean>(false);

  severityOptions: DropdownOption[] = [
    { label: 'All Alerts', value: 'all' },
    { label: 'Critical', value: 'critical' },
    { label: 'High', value: 'high' },
    { label: 'Medium', value: 'medium' },
    { label: 'Low', value: 'low' },
    { label: 'Support', value: 'support' }
  ];

  // Data
  alerts = signal<AlertItem[]>([]);
  // Use global stats from service as single source of truth
  stats = this.alertsService.stats;

  protected totalCount = signal<number>(0);
  protected currentPage = signal<number>(1);
  private readonly pageSize = 10;

  // Computed display list
  filteredAlerts = computed(() => {
    let list = this.alerts();

    // 1. Resolve Filter
    if (this.hideRead()) {
      list = list.filter(a => !a.resolved);
    }

    // 2. Severity & Type Filter
    const filter = this.severityFilter();
    if (filter !== 'all') {
      if (filter === 'support') {
        list = list.filter(a => a.type === 'support_reply');
      } else {
        list = list.filter(a => a.severity.toLowerCase() === filter.toLowerCase());
      }
    }

    // 3. Search Filter
    const q = this.searchQuery().toLowerCase().trim();
    if (q) {
      list = list.filter(a => a.message.toLowerCase().includes(q));
    }

    return list;
  });

  canLoadMore = computed(() => this.alerts().length < this.totalCount());

  ngOnInit() {
    this.fetchData();

    // Set up real-time listener
    this.alertsService.alert$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((alert) => {
        // Add the new alert to the top of the list instantly
        this.alerts.update(prev => [alert, ...prev]);
        this.totalCount.update(c => c + 1);

        // Update cache
        this.cache.setItem('emotra_alerts_meta', {
          data: this.alerts(),
          total: this.totalCount()
        });
      });
  }



  private fetchData() {
    const isFirstPage = this.currentPage() === 1;
    const cacheKey = 'emotra_alerts_meta';

    if (isFirstPage) {
      const cached = this.cache.getItem<{ data: AlertItem[], total: number }>(cacheKey);
      if (cached) {
        this.alerts.set(cached.data);
        this.totalCount.set(cached.total);
        this.isLoading.set(false);
      }
    } else {
      this.isLoadingMore.set(true);
    }

    // Stats Fetch (always)
    this.alertService.getStats()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          if (res.is_success && res.data) {
            this.alertsService.updateFullStats(res.data);
          }
        }
      });

    // Alerts Fetch
    this.alertService.getAlerts(this.currentPage(), this.pageSize)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          if (res.is_success && res.data) {
            const totalCount = res.data.total_count;
            this.totalCount.set(totalCount);

            if (isFirstPage) {
              this.alerts.set(res.data.items);
              this.cache.setItem(cacheKey, { data: res.data.items, total: totalCount });
            } else {
              this.alerts.update(prev => [...prev, ...res.data!.items]);
            }
          }
          this.isLoading.set(false);
          this.isLoadingMore.set(false);
        },
        error: () => {
          this.isLoading.set(false);
          this.isLoadingMore.set(false);
        }
      });
  }

  loadMore() {
    if (this.isLoadingMore()) return;
    this.currentPage.update(p => p + 1);
    this.fetchData();
  }

  resolveAlert(id: number) {
    if (this.isResolving() !== null) return;

    this.isResolving.set(id);
    this.alertService.resolveAlert(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          if (res.is_success) {
            const item = this.alerts().find(a => a.id === id);
            this.alerts.update(list => list.map(a => a.id === id ? { ...a, resolved: true, resolved_at: new Date().toISOString() } : a));

            if (item) {
              this.alertsService.handleAlertResolved(item);
            }

            // Sync caches (meta is local to this component's view)
            this.cache.setItem('emotra_alerts_meta', {
              data: this.alerts(),
              total: this.totalCount()
            });

            this.toastService.show('Alert Resolved', 'The alert has been marked as read.', 'success', 'check');
          } else {
            this.toastService.show('Error', res.message || 'Failed to resolve alert', 'error', 'error');
          }
          this.isResolving.set(null);
        },
        error: () => {
          this.toastService.show('Error', 'An unexpected error occurred.', 'error', 'error');
          this.isResolving.set(null);
        }
      });
  }

  deleteAlert(id: number) {
    this.toastService.confirm(
      'Delete Alert?',
      'This action cannot be undone. All session references will be preserved but the alert record will be removed.',
      () => this.executeDelete(id),
      { confirmLabel: 'Delete', type: 'error', icon: 'trash' }
    );
  }

  private executeDelete(id: number) {
    this.alertService.deleteAlert(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          if (res.is_success) {
            const item = this.alerts().find(a => a.id === id);
            if (item) {
              this.alerts.update(list => list.filter(a => a.id !== id));
              this.totalCount.update(c => Math.max(0, c - 1));

              // AlertsService handles all counter decrements centrally
              this.alertsService.handleAlertDeleted(item);

              // Sync caches
              this.cache.setItem('emotra_alerts_meta', {
                data: this.alerts(),
                total: this.totalCount()
              });

              this.toastService.show('Deleted', 'Alert removed successfully.', 'success', 'trash');
            }
          } else {
            this.toastService.show('Error', res.message || 'Failed to delete alert', 'error', 'error');
          }
        },
        error: () => this.toastService.show('Error', 'An unexpected error occurred.', 'error', 'error')
      });
  }

  viewSession(alert: AlertItem) {
    if (!alert.analysis_id) {
      this.toastService.show('Info', 'No session data associated with this alert.', 'info', 'info');
      return;
    }

    const { client_id, analysis_id } = alert;

    // 1. Try Cache First via Storage Service
    if (client_id) {
      const textSession = this.storageService.getSessions().find((s: AnalysisSession) => s.id === client_id || s.cloudId === analysis_id);
      if (textSession) {
        this.router.navigate(['/analysis', 'text', client_id]);
        return;
      }

      const audioSession = this.storageService.getAudioSessions().find((s: AudioAnalysisSession) => s.id === client_id || s.cloudId === analysis_id);
      if (audioSession) {
        this.router.navigate(['/analysis', 'audio', client_id]);
        return;
      }

      // 2. API fallback (using UUID)
      this.analysisV2Service.getAnalysisDetails(client_id)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (res) => {
            if (res.is_success && res.data) {
              const session = this.analysisV2Service.mapDetailsToSession(res.data);
              const type = res.data.type?.toLowerCase() || 'text';

              if (type === 'text') {
                this.storageService.saveSession(session as AnalysisSession);
              } else {
                this.storageService.saveAudioSession(session as AudioAnalysisSession);
              }

              this.router.navigate(['/analysis', type, session.id]);
            } else {
              this.toastService.show('Error', 'Session details not found.', 'error', 'error');
            }
          },
          error: () => this.toastService.show('Error', 'Failed to fetch session details.', 'error', 'error')
        });
    } else {
      this.toastService.show('Error', 'Missing session reference.', 'error', 'error');
    }
  }



  formatDate(dateStr: string): string {
    return this.format.formatDate(dateStr);
  }
}
