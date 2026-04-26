import { Component, inject, computed, signal, effect, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { RouterLink } from '@angular/router';
import { NgxEchartsDirective } from 'ngx-echarts';
import { AnalysisStorageService } from '../../../core/services/analysis-storage.service';
import { AnalysisV2Service } from '../../../core/services/analysis-v2.service';
import { ChartThemeService } from '../../../core/services/chart-theme.service';
import { ColorSettingsService } from '../../../core/services/color-settings.service';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { SegmentedNavComponent } from '../../../shared/components/segmented-nav/segmented-nav.component';
import { AnalysisHistoryItem } from '../../../core/models/analysis-v2.model';
import { LoadingStateComponent } from "../../../shared/components/loading-state/loading-state.component";

// ── Types ────────────────────────────────────────────────────────────────────

interface FilterTab {
  value: string;
  label: string;
}

type TypeFilter = 'all' | 'text' | 'audio';
type RangeFilter = '7d' | '30d' | 'all';

/** Flat view model for each history entry. */
interface JourneyEntry {
  id: string;
  type: string;
  timestamp: number;   // ms
  dateLabel: string;   // short display label
  emotion: string;     // lowercase
  confidence: number;  // 0–100
}

// ── Constants ─────────────────────────────────────────────────────────────────

export const EMOTIONS = ['anger', 'disgust', 'fear', 'joy', 'neutral', 'sadness', 'surprise'] as const;
type EmotionKey = typeof EMOTIONS[number];

const TYPE_TABS: FilterTab[] = [
  { value: 'all', label: 'All Tracks' },
  { value: 'text', label: 'Text' },
  { value: 'audio', label: 'Audio' },
];

const RANGE_TABS: FilterTab[] = [
  { value: '7d', label: '7 Days' },
  { value: '30d', label: '30 Days' },
  { value: 'all', label: 'All Time' },
];

// ── Component ─────────────────────────────────────────────────────────────────

@Component({
  selector: 'app-emotion-history-timeline',
  standalone: true,
  imports: [RouterLink, NgxEchartsDirective, EmptyStateComponent, SegmentedNavComponent, LoadingStateComponent],
  templateUrl: './emotion-history-timeline.component.html',
  styleUrl: './emotion-history-timeline.component.css',
})
export class EmotionHistoryTimelineComponent {
  private analysisService = inject(AnalysisV2Service);
  private storage = inject(AnalysisStorageService);
  private chartTheme = inject(ChartThemeService);
  private colorService = inject(ColorSettingsService);
  private isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  // ── State signals ─────────────────────────────────────────────────────────
  historyItems = signal<AnalysisHistoryItem[]>([]);
  isLoading = signal<boolean>(true);

  // ── Expose tab arrays to template ─────────────────────────────────────────
  readonly typeTabs = TYPE_TABS;
  readonly rangeTabs = RANGE_TABS;
  readonly emotions = EMOTIONS;

  // ── Filter signals ────────────────────────────────────────────────────────
  typeFilter = signal<TypeFilter>('all');
  rangeFilter = signal<RangeFilter>('all');

  // ── Selected emotion for deep-dive chart ──────────────────────────────────
  selectedEmotion = signal<EmotionKey>('joy');

  // ── Computed: all raw entries normalised ──────────────────────────────────
  private allEntries = computed<JourneyEntry[]>(() => {
    // We combine cloud data (primary) with local data (fallback/un-synced)
    // In V2, we prioritize the historyItems from the database.
    const cloudItems = this.historyItems();
    const localItems = this.storage.allSessions();

    // Map cloud items to normalized JourneyEntry
    const cloudMapped = cloudItems.map(item => ({
      id: item.client_id || `cloud_${item.id}`,
      type: item.type.toLowerCase(),
      timestamp: new Date(item.timestamp).getTime(),
      dateLabel: new Date(item.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      emotion: (item.dominant_emotion || 'neutral').toLowerCase(),
      confidence: item.confidence_percent || (item.confidence * 100) || 0
    }));

    // Map local items that aren't synced yet (optional, for offline support)
    const localUnsynced = localItems
      .filter(s => !s.isSynced)
      .map((s, index) => {
        const tsMs = s.timestamp ? new Date(s.timestamp).getTime() : Date.now();
        return {
          id: `local_${s.id || 'new'}_${index}`,
          type: (s.type || 'text').toLowerCase(),
          timestamp: tsMs,
          dateLabel: new Date(tsMs).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
          emotion: this.getDominantLabel(s).toLowerCase(),
          confidence: this.getDominantConfidence(s)
        };
      });

    return [...cloudMapped, ...localUnsynced]
      .sort((a, b) => a.timestamp - b.timestamp);
  });

  // ── Computed: entries after type + range filters ──────────────────────────
  filteredEntries = computed<JourneyEntry[]>(() => {
    let list = this.allEntries();
    const type = this.typeFilter();
    const range = this.rangeFilter();

    if (type !== 'all') list = list.filter(e => e.type === type);

    if (range !== 'all') {
      const days = range === '7d' ? 7 : 30;
      // Start of the day bounding for correct 'last 7 days' inclusion
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);
      cutoffDate.setHours(0, 0, 0, 0);
      const cutoff = cutoffDate.getTime();

      list = list.filter(e => e.timestamp >= cutoff);
    }

    return list;
  });

  // ── Computed: most frequent emotion (sets default badge selection) ─────────
  private mostFrequentEmotion = computed<EmotionKey>(() => {
    const counts: Record<string, number> = {};
    for (const e of this.allEntries()) {
      counts[e.emotion] = (counts[e.emotion] || 0) + 1;
    }
    const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
    return (top ? top[0] : 'joy') as EmotionKey;
  });

  // ── Computed: ECharts options for the Journey chart ───────────────────────
  journeyChartOptions = computed(() => {
    if (!this.isBrowser) return {};
    const theme = this.chartTheme.getChartTheme();
    const entries = this.filteredEntries();
    const emoColors = this.colorService.emotionColors();

    if (entries.length === 0) return {};

    const lineColor = this.getCssVar('--text-muted', '#64748b');

    // dot color comes from CSS var — resolve at draw time
    const dotColors = entries.map(e =>
      emoColors[e.emotion] ?? this.getCssVar(`--emotion-${e.emotion}`, emoColors['neutral'])
    );

    return {
      ...theme,
      backgroundColor: 'transparent',
      grid: { left: 16, right: 16, top: 40, bottom: 84, containLabel: true },
      tooltip: {
        ...theme.tooltip,
        trigger: 'axis',
        axisPointer: { type: 'cross', crossStyle: { color: lineColor } },
        confine: true, // Prevent layout breaking in small themes
        formatter: (params: any[]) => {
          if (!params || !params.length) return '';
          const p = params[0];
          const e = entries[p.dataIndex];
          if (!e) return '';

          const col = dotColors[p.dataIndex];
          return `
            <div style="font-weight:800;margin-bottom:6px;color:${col};text-transform:capitalize">${e.emotion}</div>
            <div style="font-size:11px;opacity:.8;margin-bottom:4px">${e.confidence.toFixed(1)}% confidence</div>
            <div style="font-size:10px;opacity:.5;text-transform:uppercase;font-weight:700">${e.type} · ${e.dateLabel}</div>
          `;
        },
      },
      xAxis: {
        ...theme.xAxis,
        type: 'category',
        boundaryGap: true,
        data: entries.map(e => e.id),
        axisPointer: {
          label: {
            formatter: (params: any) => {
              const entry = entries.find(e => e.id === params.value);
              return entry ? entry.dateLabel : params.value;
            }
          }
        },
        axisLabel: {
          ...theme.xAxis?.axisLabel,
          formatter: (value: string) => {
            const entry = entries.find(e => e.id === value);
            return entry ? entry.dateLabel : value;
          },
          rotate: entries.length > 12 ? 30 : 0
        },
      } as any,
      yAxis: {
        ...theme.yAxis,
        type: 'value',
        min: 0, max: 100,
        axisLabel: { ...theme.yAxis?.axisLabel, formatter: (v: number) => `${v}%` },
      } as any,
      dataZoom: [
        {
          type: 'slider',
          start: 0,
          end: 100,
          bottom: 12, // Moved up slightly
          height: 20,
          borderColor: 'transparent',
          fillerColor: 'rgba(108, 99, 255, 0.15)',
          handleStyle: { color: '#6c63ff' },
          textStyle: { color: 'transparent' },
        },
        {
          type: 'inside',
        }
      ],
      graphic: [{
        type: 'text',
        left: 16,
        bottom: 35,
        style: {
          text: 'ZOOM & SCROLL',
          font: '900 10px sans-serif',
          fill: lineColor
        }
      }],
      series: [{
        type: 'line',
        // Plots each dot exactly at its dominant emotion's calculated probability/confidence
        data: entries.map(e => +e.confidence.toFixed(1)),
        smooth: true,
        showAllSymbol: true, // Forces ECharts to draw ALL dots even if X-axis labels are hidden
        lineStyle: { color: lineColor, width: 1.5, opacity: 0.3 },
        itemStyle: { color: (p: any) => dotColors[p.dataIndex] },
        symbolSize: entries.length > 40 ? 8 : 12,
        symbol: 'circle',
        emphasis: {
          itemStyle: { borderWidth: 2, borderColor: 'var(--bg-card)' },
          lineStyle: { width: 2, opacity: 0.6 },
          scale: false,
        },
        animationDuration: 800,
      }],
    } as any;
  });

  // ── Computed: ECharts options for the Deep-dive chart ─────────────────────
  deepDiveChartOptions = computed(() => {
    if (!this.isBrowser) return {};
    const theme = this.chartTheme.getChartTheme();
    const entries = this.filteredEntries();
    const emotion = this.selectedEmotion();
    const emoColors = this.colorService.emotionColors();

    const relevant = entries.filter(e => e.emotion === emotion);
    if (relevant.length === 0) return {};

    const lineColor = emoColors[emotion] ?? this.getCssVar(`--emotion-${emotion}`, emoColors['neutral']);

    return {
      ...theme,
      backgroundColor: 'transparent',
      grid: { left: 16, right: 16, top: 16, bottom: 48, containLabel: true },
      tooltip: {
        ...theme.tooltip,
        trigger: 'axis',
        axisPointer: { type: 'cross', crossStyle: { color: this.getCssVar('--text-muted', '#94a3b8') } },
        formatter: (params: any[]) => {
          const p = params[0];
          const entry = relevant[p.dataIndex];
          return `
            <div style="font-weight:800;margin-bottom:4px">${entry?.dateLabel || p.name}</div>
            <div style="font-size:12px;font-weight:700;color:${lineColor}">${p.value.toFixed(1)}%</div>
          `;
        },
      },
      xAxis: {
        ...theme.xAxis,
        type: 'category',
        boundaryGap: false,
        data: relevant.map(e => e.id),
        axisPointer: {
          label: {
            formatter: (params: any) => {
              const entry = relevant.find(e => e.id === params.value);
              return entry ? entry.dateLabel : params.value;
            }
          }
        },
        axisLabel: {
          ...theme.xAxis?.axisLabel,
          formatter: (value: string) => {
            const entry = relevant.find(e => e.id === value);
            return entry ? entry.dateLabel : value;
          },
          rotate: relevant.length > 12 ? 30 : 0
        },
      } as any,
      yAxis: {
        ...theme.yAxis,
        type: 'value',
        min: 0, max: 100,
        axisLabel: { ...theme.yAxis?.axisLabel, formatter: (v: number) => `${v}%` },
      } as any,
      series: [{
        type: 'line',
        data: relevant.map(e => +e.confidence.toFixed(1)),
        smooth: true,
        showAllSymbol: true, // Forces ECharts to draw ALL dots even if X-axis labels are hidden
        symbolSize: relevant.length > 40 ? 5 : 7,
        symbol: 'circle',
        lineStyle: { color: lineColor, width: 2.5 },
        itemStyle: { color: lineColor },
        areaStyle: {
          opacity: 0.12,
          color: {
            type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: lineColor },
              { offset: 1, color: 'transparent' },
            ],
          },
        },
        emphasis: { scale: false },
        animationDuration: 800,
      }],
    } as any;
  });

  // ── Setters ───────────────────────────────────────────────────────────────
  setTypeFilter(id: string): void {
    this.typeFilter.set(id as TypeFilter);
  }
  setRangeFilter(id: string): void { this.rangeFilter.set(id as RangeFilter); }
  selectEmotion(e: EmotionKey): void { this.selectedEmotion.set(e); }

  /** Resolve default badge selection once data is available */
  constructor() {
    this.fetchHistory();

    effect(() => {
      const top = this.mostFrequentEmotion();
      if (top) this.selectedEmotion.set(top);
    }, {});
  }

  private fetchHistory(): void {
    if (!this.isBrowser) return;

    this.isLoading.set(true);
    // Fetching large page size since this is for a comprehensive timeline
    this.analysisService.getHistory(1, 100).subscribe({
      next: (res) => {
        if (res.is_success && res.data) {
          this.historyItems.set(res.data);
        }
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
      }
    });
  }

  // ── Template helpers ──────────────────────────────────────────────────────

  /** Dynamic emotion color via CSS variable — stays in sync with user settings */
  emotionCssVar(emotion: string): string {
    return `var(--emotion-${emotion.toLowerCase()})`;
  }

  /** True if filtered data contains at least one entry for this emotion */
  hasEmotionData(emotion: string): boolean {
    return this.filteredEntries().some(e => e.emotion === emotion.toLowerCase());
  }

  // ── Private helpers ───────────────────────────────────────────────────────
  private getDominantLabel(s: any): string {
    const isText = (s.type || '').toLowerCase() === 'text';
    if (isText) {
      return s.result?.combined_final_emotion?.label || 'neutral';
    }
    return s.result?.final_multimodal_emotion?.label || s.result?.combined_final_emotion?.label || 'neutral';
  }

  private getDominantConfidence(s: any): number {
    const isText = (s.type || '').toLowerCase() === 'text';
    if (isText) {
      return s.result?.combined_final_emotion?.confidence_percent || 0;
    }
    return s.result?.final_multimodal_emotion?.confidence_percent || s.result?.combined_final_emotion?.confidence_percent || 0;
  }

  private getCssVar(variable: string, fallback = ''): string {
    if (!this.isBrowser) return fallback;
    return getComputedStyle(document.documentElement).getPropertyValue(variable).trim() || fallback;
  }
}
