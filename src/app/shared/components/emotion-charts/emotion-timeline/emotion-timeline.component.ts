import { Component, input, computed, effect, inject } from '@angular/core';

import { NgxEchartsDirective } from 'ngx-echarts';
import { ChartThemeService } from '../../../../core/services/chart-theme.service';
import { ColorSettingsService } from '../../../../core/services/color-settings.service';
import { TimelineDataPoint } from '../../../../core/models/chart-data.model';

@Component({
  selector: 'app-emotion-timeline',
  standalone: true,
  imports: [NgxEchartsDirective],
  templateUrl: './emotion-timeline.component.html',
  styleUrls: ['./emotion-timeline.component.css']
})
export class EmotionTimelineComponent {
  private chartTheme = inject(ChartThemeService);
  private colorSettings = inject(ColorSettingsService);

  /** Primary timeline data (Analysis A in comparison mode) */
  data = input.required<TimelineDataPoint[]>();

  /** Optional secondary data for Compare mode (Analysis B) */
  secondaryData = input<TimelineDataPoint[] | null>(null);

  /** Optional dominant emotion to highlight lines (Analysis A) */
  dominant = input<string | null>(null);

  /** Optional dominant emotion for Analysis B in comparison */
  secondaryDominant = input<string | null>(null);

  /** Toggle for comparison mode styling (solid vs dashed) */
  compareMode = input<boolean>(false);

  /** Main ECharts Computed Options */
  chartOptions = computed(() => {
    const theme = this.chartTheme.getChartTheme();
    const timelineA = this.data();
    const timelineB = this.secondaryData();
    const dominatesA = this.dominant()?.toLowerCase();
    const dominatesB = this.secondaryDominant()?.toLowerCase();
    const isCompare = this.compareMode();
    const emotionColors = this.colorSettings.emotionColors();

    const emotions = Object.keys(emotionColors);

    const dataKeys = Array.from(new Set(timelineA.flatMap(p => Object.keys(p.probabilities))));

    // Calculate which keys to show
    const activeEmotions = isCompare ? emotions : dataKeys.filter(k => {
      // If it's a standard emotion, apply the 2% threshold filter
      if (emotions.includes(k)) {
        return timelineA.some(p => (p.probabilities[k] ?? 0) > 0.02);
      }
      // If it's a custom key (like 'Confidence'), always show it
      return true;
    });

    const maxLength = Math.max(timelineA.length, timelineB?.length || 0);
    const xAxisData = Array.from({ length: maxLength }, (_, i) => timelineA[i]?.label || timelineB?.[i]?.label || `S${i + 1}`);

    const series: any[] = [];

    const primaryColor = getComputedStyle(document.documentElement).getPropertyValue('--brand-primary').trim() || '#6C63FF';

    activeEmotions.forEach(emotion => {
      let color = emotionColors[emotion];

      // Special override for dashboard/precision trends
      if (emotion === 'Confidence' || emotion === 'Precision') {
        color = primaryColor;
      } else {
        color = color || emotionColors['neutral'];
      }

      const capEmotion = emotion.charAt(0).toUpperCase() + emotion.slice(1);

      // Series for Analysis A (Solid line)
      if (timelineA.length > 0) {
        const isDom = dominatesA === emotion;
        series.push({
          name: capEmotion,
          type: 'line',
          data: timelineA.map(p => p.probabilities[emotion] || 0),
          smooth: true,
          symbol: 'circle',
          symbolSize: isDom ? 8 : 5,
          areaStyle: (emotion === 'Confidence' || emotion === 'Precision') ? {
            opacity: 0.15,
            color: {
              type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [{ offset: 0, color: primaryColor }, { offset: 1, color: 'transparent' }]
            }
          } : undefined,
          lineStyle: {
            color,
            width: isDom ? 3 : 1.5,
            opacity: isDom ? 1 : 0.55
          },
          itemStyle: { color },
          emphasis: { lineStyle: { width: 3, opacity: 1 }, symbolSize: 9 }
        });
      }

      // Series for Analysis B (Dashed line) - Only in Compare Mode
      if (isCompare && timelineB && timelineB.length > 0) {
        const isDom = dominatesB === emotion;
        series.push({
          name: capEmotion,
          type: 'line',
          data: timelineB.map(p => p.probabilities[emotion] || 0),
          smooth: true,
          symbol: 'circle',
          symbolSize: isDom ? 8 : 5,
          lineStyle: {
            color,
            width: isDom ? 3 : 1.5,
            opacity: isDom ? 0.45 : 0.25,
            type: 'dashed'
          },
          itemStyle: { color },
          emphasis: { lineStyle: { width: 3, opacity: 1 }, symbolSize: 9 }
        });
      }
    });

    return {
      ...theme,
      backgroundColor: 'transparent',
      grid: { left: 12, right: 24, bottom: 40, top: 16, containLabel: true },
      legend: {
        ...theme.legend,
        data: activeEmotions.map(e => e.charAt(0).toUpperCase() + e.slice(1)),
        bottom: 0,
        type: 'scroll',
        pageIconColor: '#94a3b8',
        pageTextStyle: { color: '#94a3b8' }
      },
      tooltip: {
        ...theme.tooltip,
        trigger: 'axis',
        axisPointer: { type: 'cross', crossStyle: { color: '#94a3b8' } },
        confine: true,
        formatter: (params: any[]) => {
          if (!params || !params.length) return '';
          const idx = params[0]?.dataIndex ?? 0;
          const pA = timelineA[idx];
          const pB = timelineB?.[idx];

          let html = `<div style="font-weight:800; color:var(--text-primary); margin-bottom:10px; padding-bottom:10px; border-bottom:1.5px solid var(--border-color); font-size: 13px;">
            Position: ${pA?.label || pB?.label || idx + 1}<br/>
            ${pA?.tooltipDetail ? `<span style="font-weight:400; font-size:11px; color:var(--text-secondary); display:block; margin-top:4px">"${pA.tooltipDetail.length > 60 ? pA.tooltipDetail.slice(0, 60) + '…' : pA.tooltipDetail}"</span>` : ''}
          </div>`;

          if (isCompare) {
            html += `<div style="display:grid; grid-template-columns: 1fr 1fr; gap: 15px; font-size: 11px;">`;
            // Analysis A list
            html += `<div><div class="font-black text-[9px] uppercase opacity-60 mb-2">Analysis A</div>`;
            params.filter((_, i) => i % 2 === 0).filter(p => p.value > 0.05).sort((x, y) => y.value - x.value).forEach(p => {
              html += `<div style="display:flex; justify-content:space-between; margin-bottom: 2px;">
                  <span style="display:flex; align-items:center; gap:4px">
                    <span style="width:6px; height:6px; border-radius:50%; background:${p.color}"></span>
                    ${p.seriesName}
                  </span>
                  <span style="font-weight:700; opacity:0.8">${(p.value * 100).toFixed(1)}%</span>
                </div>`;
            });
            html += `</div>`;
            // Analysis B list
            html += `<div><div class="font-black text-[9px] uppercase opacity-60 mb-2">Analysis B</div>`;
            params.filter((_, i) => i % 2 !== 0).filter(p => p.value > 0.05).sort((x, y) => y.value - x.value).forEach(p => {
              html += `<div style="display:flex; justify-content:space-between; margin-bottom: 2px;">
                  <span style="display:flex; align-items:center; gap:4px">
                    <span style="width:6px; height:6px; border-radius:50%; background:${p.color}"></span>
                    ${p.seriesName}
                  </span>
                  <span style="font-weight:700; opacity:0.8">${(p.value * 100).toFixed(1)}%</span>
                </div>`;
            });
            html += `</div></div>`;
          } else {
            params.filter(p => p.value > 0.02).sort((a: any, b: any) => b.value - a.value).forEach((p: any) => {
              html += `<div style="display:flex;align-items:center;justify-content:space-between;gap:24px;padding:3px 0">
                <span style="display:flex;align-items:center;gap:8px">
                  <span style="width:8px;height:8px;border-radius:50%;background:${p.color}"></span>${p.seriesName}
                </span>
                <span style="font-weight:700">${(p.value * 100).toFixed(1)}%</span>
              </div>`;
            });
          }
          return html;
        }
      },
      xAxis: {
        ...theme.xAxis,
        type: 'category',
        boundaryGap: false,
        data: xAxisData
      } as any,
      yAxis: {
        ...theme.yAxis,
        type: 'value',
        min: 0, max: 1,
        axisLabel: { ...theme.yAxis?.axisLabel, formatter: (v: number) => `${(v * 100).toFixed(0)}%` }
      } as any,
      series: series as any,
      animationDuration: 1400,
      animationEasing: 'cubicOut' as any
    } as any;
  });
}
