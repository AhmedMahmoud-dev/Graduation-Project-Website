import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgxEchartsDirective } from 'ngx-echarts';
import { EChartsOption } from 'echarts';
import { AdminService } from '../../../core/services/admin.service';
import { PlatformStats } from '../../../core/models/admin.model';
import { ChartThemeService } from '../../../core/services/chart-theme.service';
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
  private cache = inject(AppCacheService);
  protected format = inject(FormattingService);

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
    return Object.entries(currentStats.analyses_by_type).map(([label, value]) => {
      const isAudio = label.toLowerCase() === 'audio';
      const isText = label.toLowerCase() === 'text';
      return {
        label: label.charAt(0).toUpperCase() + label.slice(1),
        value,
        color: isAudio ? '#a855f7' : (isText ? '#3b82f6' : undefined)
      };
    });
  });

  /** Trend line chart options for general platform growth */
  trendChartOptions = computed<EChartsOption>(() => {
    const currentStats = this.stats();
    const theme = this.chartTheme.getChartTheme();
    if (!currentStats) return {};

    const dates = currentStats.analysis_trend.map(t => this.formatDate(t.date));
    const newUsersDates = currentStats.new_users_trend.map(t => this.formatDate(t.date));

    const brandPrimary = getComputedStyle(document.documentElement).getPropertyValue('--brand-primary').trim() || '#6c63ff';
    const accent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#00d4aa';

    const allDates = Array.from(new Set([...dates, ...newUsersDates])).sort();
    const dateToAnalysis = new Map(currentStats.analysis_trend.map(t => [this.formatDate(t.date), t.count]));
    const dateToUsers = new Map(currentStats.new_users_trend.map(t => [this.formatDate(t.date), t.count]));

    return {
      ...theme,
      backgroundColor: 'transparent',
      tooltip: { ...theme.tooltip, trigger: 'axis' },
      legend: { data: ['Analyses', 'New Users'], bottom: 0, textStyle: { ...theme.legend?.textStyle } },
      grid: { left: 12, right: 24, bottom: 40, top: 16, containLabel: true },
      xAxis: { ...theme.xAxis, type: 'category', boundaryGap: false, data: allDates } as any,
      yAxis: { ...theme.yAxis, type: 'value' } as any,
      series: [
        {
          name: 'Analyses', type: 'line', smooth: true, data: allDates.map(d => dateToAnalysis.get(d) ?? 0),
          itemStyle: { color: brandPrimary }, lineStyle: { width: 2.5 },
          areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: brandPrimary + '40' }, { offset: 1, color: brandPrimary + '00' }] } }
        },
        {
          name: 'New Users', type: 'line', smooth: true, data: allDates.map(d => dateToUsers.get(d) ?? 0),
          itemStyle: { color: accent }, lineStyle: { width: 2.5 },
          areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: accent + '40' }, { offset: 1, color: accent + '00' }] } }
        }
      ]
    } as any;
  });

  /** Detailed trend comparing Text vs Audio analyses over time */
  typeTrendOptions = computed<EChartsOption>(() => {
    const currentStats = this.stats();
    const theme = this.chartTheme.getChartTheme();
    if (!currentStats || !currentStats.analyses_by_type_trend) return {};

    const dates = currentStats.analyses_by_type_trend.map(t => this.formatDate(t.date));
    const textData = currentStats.analyses_by_type_trend.map(t => t.text_count);
    const audioData = currentStats.analyses_by_type_trend.map(t => t.audio_count);

    const purple = '#a855f7';
    const blue = '#3b82f6';

    return {
      ...theme,
      backgroundColor: 'transparent',
      tooltip: { ...theme.tooltip, trigger: 'axis' },
      legend: { data: ['Text', 'Audio'], bottom: 0, textStyle: { ...theme.legend?.textStyle } },
      grid: { left: 12, right: 24, bottom: 40, top: 16, containLabel: true },
      xAxis: { ...theme.xAxis, type: 'category', boundaryGap: true, data: dates } as any,
      yAxis: { ...theme.yAxis, type: 'value' } as any,
      series: [
        {
          name: 'Text', type: 'bar', stack: 'total', barWidth: '40%',
          data: textData, itemStyle: { color: blue, borderRadius: [4, 4, 0, 0] }
        },
        {
          name: 'Audio', type: 'bar', stack: 'total', barWidth: '40%',
          data: audioData, itemStyle: { color: purple, borderRadius: [4, 4, 0, 0] }
        }
      ]
    } as any;
  });

  private formatDate(dateStr: string): string {
    const parts = dateStr.split('T')[0].split('-');
    return parts.length === 3 ? `${parts[1]}/${parts[2]}` : dateStr;
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

    this.adminService.getStats().subscribe({
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
