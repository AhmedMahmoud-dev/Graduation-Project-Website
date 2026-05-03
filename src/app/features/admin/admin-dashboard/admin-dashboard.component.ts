import { Component, OnInit, inject, signal, computed, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { NgxEchartsDirective } from 'ngx-echarts';
import { EChartsOption } from 'echarts';
import { AdminService } from '../../../core/services/admin.service';
import { PlatformStats } from '../../../core/models/admin.model';
import { ChartThemeService } from '../../../core/services/chart-theme.service';
import { ThemeService } from '../../../core/services/theme.service';
import { ColorSettingsService } from '../../../core/services/color-settings.service';
import { FormattingService } from '../../../core/services/formatting.service';
import { AppCacheService } from '../../../core/services/app-cache.service';
import { LoadingStateComponent } from '../../../shared/components/loading-state/loading-state.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { EmotionDistributionComponent } from '../../../shared/components/emotion-charts/emotion-distribution/emotion-distribution.component';
import { PageHeaderComponent } from '../../../shared/components/layout/page-header/page-header.component';
import { DistributionDataPoint } from '../../../core/models/chart-data.model';
import { useTableSort } from '../../../core/utils/sort.util';
import { DropdownMenuComponent, DropdownOption } from '../../../shared/components/dropdown-menu/dropdown-menu.component';
import { AnalysisSectionHeaderComponent } from '../../../shared/components/analysis-section-header/analysis-section-header.component';
import { AdminChartService } from '../../../core/services/admin-chart.service';

const CACHE_KEY = 'emotra_admin_stats';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    NgxEchartsDirective,
    LoadingStateComponent,
    EmptyStateComponent,
    EmotionDistributionComponent,
    PageHeaderComponent,
    DropdownMenuComponent,
    AnalysisSectionHeaderComponent
  ],
  templateUrl: './admin-dashboard.component.html',
  styleUrl: './admin-dashboard.component.css'
})
export class AdminDashboardComponent implements OnInit {
  private adminService = inject(AdminService);
  private chartTheme = inject(ChartThemeService);
  private themeService = inject(ThemeService);
  private colorSettings = inject(ColorSettingsService);
  private cache = inject(AppCacheService);
  protected format = inject(FormattingService);
  private destroyRef = inject(DestroyRef);
  private chartService = inject(AdminChartService);

  stats = signal<PlatformStats | null>(null);
  isLoading = signal<boolean>(true);
  error = signal<string | null>(null);
  isRefreshing = signal<boolean>(false);

  topUsersList = computed(() => this.stats()?.top_active_users || []);
  sortState = useTableSort<{ user_id: string; full_name: string; email: string; analysis_count: number }>(this.topUsersList);
  sortedTopUsers = this.sortState.sortedData;

  sortOptions: DropdownOption[] = [
    { label: 'Default (None)', value: '' },
    { label: 'Name (A-Z)', value: 'full_name:asc' },
    { label: 'Name (Z-A)', value: 'full_name:desc' },
    { label: 'Analyses (High-Low)', value: 'analysis_count:desc' },
    { label: 'Analyses (Low-High)', value: 'analysis_count:asc' }
  ];

  selectedSortValue = computed(() => {
    const col = this.sortState.sortColumn();
    const dir = this.sortState.sortDirection();
    return col && dir ? `${String(col)}:${dir}` : '';
  });

  onMobileSortChange(value: string): void {
    if (!value) {
      this.sortState.sortColumn.set(null);
      this.sortState.sortDirection.set(null);
      return;
    }
    const [col, dir] = value.split(':');
    this.sortState.sortColumn.set(col as any);
    this.sortState.sortDirection.set(dir as 'asc' | 'desc');
  }

  /** Transform API emotion data into DistributionDataPoint[] for the shared pie component */
  emotionData = computed<DistributionDataPoint[]>(() => {
    const currentStats = this.stats();
    if (!currentStats || !currentStats.emotion_distribution) return [];

    return Object.entries(currentStats.emotion_distribution).map(([label, value]) => ({
      label,
      value
    }));
  });

  /** Analyses by Type data for a doughnut chart */
  analysesByTypeData = computed<DistributionDataPoint[]>(() => {
    const currentStats = this.stats();
    if (!currentStats || !currentStats.analyses_by_type) return [];

    const isDark = this.themeService.resolvedTheme() === 'dark';
    const themeColors = isDark ? this.colorSettings.darkColors() : this.colorSettings.lightColors();

    const purple = themeColors['--color-primary'] || '#a855f7';
    const blue = themeColors['--color-accent'] || '#3b82f6';

    return this.chartService.getAnalysesByTypeOptions(currentStats, purple, blue);
  });

  /** Trend line chart options for general platform growth */
  trendChartOptions = computed<EChartsOption>(() => {
    const currentStats = this.stats();
    const theme = this.chartTheme.getChartTheme();
    if (!currentStats) return {};

    const isDark = this.themeService.resolvedTheme() === 'dark';
    const themeColors = isDark ? this.colorSettings.darkColors() : this.colorSettings.lightColors();

    const brandPrimary = themeColors['--color-primary'] || '#6c63ff';
    const accent = themeColors['--color-accent'] || '#00d4aa';

    return this.chartService.getTrendChartOptions(currentStats, theme, brandPrimary, accent);
  });

  /** Detailed trend comparing Text vs Audio analyses over time */
  typeTrendOptions = computed<EChartsOption>(() => {
    const currentStats = this.stats();
    const theme = this.chartTheme.getChartTheme();
    if (!currentStats || !currentStats.analyses_by_type_trend) return {};

    const isDark = this.themeService.resolvedTheme() === 'dark';
    const themeColors = isDark ? this.colorSettings.darkColors() : this.colorSettings.lightColors();

    const purple = themeColors['--color-primary'] || '#a855f7';
    const blue = themeColors['--color-accent'] || '#3b82f6';

    return this.chartService.getTypeTrendOptions(currentStats, theme, purple, blue);
  });

  getInitials(name: string): string {
    return this.format.getInitials(name);
  }

  ngOnInit(): void {
    // 1. Check cache
    const cached = this.cache.getItem<PlatformStats>(CACHE_KEY);

    if (cached) {
      // Show cached data instantly
      this.stats.set(cached);
      this.isLoading.set(false);
      // Still fetch in background to sync
      this.fetchStats(true);
    } else {
      // No cache, full fetch with loading spinner
      this.fetchStats(false);
    }
  }

  fetchStats(isBackground: boolean = false): void {
    if (!isBackground) {
      if (!this.stats()) {
        this.isLoading.set(true);
      } else {
        this.isRefreshing.set(true);
      }
    }
    this.error.set(null);

    this.adminService.getStats()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          if (res.is_success && res.data) {
            this.cache.setItem(CACHE_KEY, res.data);
            this.stats.set(res.data);
          } else {
            if (!this.stats()) {
              this.error.set(res.message || 'Failed to load platform statistics.');
            }
            this.cache.removeItem(CACHE_KEY);
          }
          this.isLoading.set(false);
          this.isRefreshing.set(false);
        },
        error: () => {
          if (!this.stats()) {
            this.error.set('An error occurred while connecting to the server.');
          }
          this.isLoading.set(false);
          this.isRefreshing.set(false);
        }
      });
  }
}
