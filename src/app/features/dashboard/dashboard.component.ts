import { Component, inject, signal, effect, OnInit, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AnalysisV2Service } from '../../core/services/analysis-v2.service';
import { ChartThemeService } from '../../core/services/chart-theme.service';
import { ColorSettingsService } from '../../core/services/color-settings.service';
import { ToastService } from '../../core/services/toast.service';
import { EmotionIconComponent } from '../../shared/components/emotion-icon/emotion-icon.component';
import { FooterSectionComponent } from '../../shared/components/footer/footer.component';
import { EmotionTimelineComponent } from '../../shared/components/emotion-charts/emotion-timeline/emotion-timeline.component';
import { EmotionDistributionComponent } from '../../shared/components/emotion-charts/emotion-distribution/emotion-distribution.component';
import { TimelineDataPoint, DistributionDataPoint } from '../../core/models/chart-data.model';
import { PageHeaderComponent } from '../../shared/components/layout/page-header/page-header.component';
import { EmotionHistoryTimelineComponent } from './emotion-history-timeline/emotion-history-timeline.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { LoadingStateComponent } from '../../shared/components/loading-state/loading-state.component';
import { AppIconComponent } from '../../shared/components/app-icon/app-icon.component';
import { FormattingService } from '../../core/services/formatting.service';
import { AppCacheService } from '../../core/services/app-cache.service';
import { AnalysisStats } from '../../core/models/analysis-v2.model';
import { AnalysisSectionHeaderComponent } from '../../shared/components/analysis-section-header/analysis-section-header.component';


export interface DashboardActivity {
  id: number;
  clientId: string;
  type: string;
  date: string;
  label: string;
  confidence: number;
  snippet: string;
}

export interface DashboardUiStats {
  total: number;
  textCount: number;
  audioCount: number;
  avgConfidence: string;
  mostCommonLabel: string;
  mostCommonIcon: string;
  categoryShare: {
    [key: string]: number;
    positive: number;
    neutral: number;
    negative: number;
  };
  totalTokens: number;
  totalDurationMinutes: number;
  totalDurationSeconds: number;
  recentActivity: DashboardActivity[];
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    EmotionIconComponent,
    FooterSectionComponent,
    EmotionTimelineComponent,
    EmotionDistributionComponent,
    PageHeaderComponent,
    EmotionHistoryTimelineComponent,
    EmptyStateComponent,
    LoadingStateComponent,
    AppIconComponent,
    AnalysisSectionHeaderComponent

  ],
  templateUrl: './app-dashboard.html',
  styleUrls: ['./app-dashboard.css']
})
export class DashboardComponent implements OnInit {
  private analysisV2Service = inject(AnalysisV2Service);
  private chartThemeService = inject(ChartThemeService);
  private colorSettingsService = inject(ColorSettingsService);
  private toastService = inject(ToastService);
  protected format = inject(FormattingService);
  private cache = inject(AppCacheService);

  private destroyRef = inject(DestroyRef);

  stats = signal<DashboardUiStats | null>(null);
  distributionData = signal<DistributionDataPoint[]>([]);
  activityData = signal<TimelineDataPoint[]>([]);
  isLoading = signal<boolean>(true);

  private processApiStats(apiStats: AnalysisStats) {
    const metrics = apiStats.usage_metrics;

    if (!metrics || metrics.total_analyses === 0) {
      this.stats.set(null);
      return;
    }

    const uiStats: DashboardUiStats = {
      total: metrics.total_analyses,
      textCount: metrics.text_count || 0,
      audioCount: metrics.audio_count || 0,
      avgConfidence: this.format.formatConfidence(metrics.avg_confidence),
      mostCommonLabel: apiStats.most_frequent?.label || 'neutral',
      mostCommonIcon: apiStats.most_frequent?.label || 'neutral',
      categoryShare: {
        positive: (apiStats.emotion_distribution?.categories as any)?.['Positive'] || (apiStats.emotion_distribution?.categories as any)?.['positive'] || 0,
        neutral: (apiStats.emotion_distribution?.categories as any)?.['Neutral'] || (apiStats.emotion_distribution?.categories as any)?.['neutral'] || 0,
        negative: (apiStats.emotion_distribution?.categories as any)?.['Negative'] || (apiStats.emotion_distribution?.categories as any)?.['negative'] || 0
      },
      totalTokens: metrics.total_tokens || 0,
      totalDurationMinutes: Math.floor((metrics.total_audio_duration_seconds || 0) / 60),
      totalDurationSeconds: Math.floor((metrics.total_audio_duration_seconds || 0) % 60),
      recentActivity: (apiStats.recent_activity || []).map(a => ({
        id: a.id,
        clientId: a.client_id,
        type: (a.type || 'text').toLowerCase(),
        date: a.timestamp,
        label: a.label || 'neutral',
        confidence: a.confidence || 0,
        snippet: this.format.truncate(a.snippet, 55) || 'Processing data'
      }))
    };

    this.stats.set(uiStats);

    const labels = apiStats.emotion_distribution?.labels || {};
    this.distributionData.set(Object.entries(labels).map(([label, value]) => ({
      label,
      value: value as number
    })));

    const trend = apiStats.activity_trend || [];
    this.activityData.set(trend.map(t => {
      // Backend might use different names, and chart expects 0-1 range
      const rawVal = (t as any).precision ?? (t as any).confidence ?? (t as any).accuracy ?? (t as any).score ?? 0;
      const normalizedVal = rawVal > 1 ? rawVal / 100 : rawVal;

      return {
        label: new Date(t.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        probabilities: { 'Precision': normalizedVal },
        tooltipTitle: `Analysis on ${new Date(t.timestamp).toLocaleDateString()}`
      };
    }));
  }

  ngOnInit() {
    // 1. Stale-while-revalidate: read cache
    const cached = this.cache.getItem<AnalysisStats>('emotra_stats');
    if (cached) {
      this.processApiStats(cached);
      this.isLoading.set(false); // Skip spinner
    } else {
      this.isLoading.set(true);
    }

    // 2. Fetch fresh
    this.analysisV2Service.getStats()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          try {
            if (res.is_success && res.data) {
              this.cache.setItem('emotra_stats', res.data);
              this.processApiStats(res.data);
            } else {
              this.stats.set(null);
              this.cache.removeItem('emotra_stats');
            }
          } catch (err) {
            console.error('Error processing dashboard stats:', err);
            this.stats.set(null);
          } finally {
            this.isLoading.set(false);
          }
        },
        error: (err) => {
          console.error('Dashboard stats API error:', err);
          this.isLoading.set(false);
          // Do not reset stats to null on error, keep cached data
          // No error toast on page load
        }
      });
  }


}
