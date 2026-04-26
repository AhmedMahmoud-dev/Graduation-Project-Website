import { Component, input, computed, inject } from '@angular/core';

import { NgxEchartsDirective } from 'ngx-echarts';
import { EChartsOption } from 'echarts';
import { ChartThemeService } from '../../../../core/services/chart-theme.service';
import { ColorSettingsService } from '../../../../core/services/color-settings.service';
import { DistributionDataPoint, DistributionViewMode } from '../../../../core/models/chart-data.model';

@Component({
  selector: 'app-emotion-distribution',
  standalone: true,
  imports: [NgxEchartsDirective],
  templateUrl: './emotion-distribution.component.html',
  styleUrls: ['./emotion-distribution.component.css']
})
export class EmotionDistributionComponent {
  private chartTheme = inject(ChartThemeService);
  private colorSettings = inject(ColorSettingsService);

  /** Data points to visualize */
  data = input.required<DistributionDataPoint[]>();

  /** View mode: 'bar' (Analysis pages) or 'pie' (Dashboard) */
  viewType = input<DistributionViewMode>('bar');

  /** Custom height for the container */
  height = input<string>('300px');

  /** Label for the data series */
  seriesName = input<string>('Emotion Breakdown');

  /** Main ECharts Computed Options */
  chartOptions = computed(() => {
    const theme = this.chartTheme.getChartTheme();
    const rawData = this.data();
    const type = this.viewType();
    const emotionColors = this.colorSettings.emotionColors();

    const sortedData = [...rawData].sort((a, b) => {
      if (type === 'bar') return a.value - b.value; // Lower values at bottom for bar
      return b.value - a.value;                      // Higher values first for pie
    });

    if (type === 'pie') {
      return this.buildPieOptions(theme, sortedData, emotionColors);
    } else {
      return this.buildBarOptions(theme, sortedData, emotionColors);
    }
  });

  private buildPieOptions(theme: any, data: DistributionDataPoint[], colors: Record<string, string>): EChartsOption {
    const pieData = data.map(d => ({
      name: d.label.charAt(0).toUpperCase() + d.label.slice(1),
      value: d.value,
      itemStyle: { color: d.color || colors[d.label.toLowerCase()] || colors['neutral'] }
    }));

    return {
      ...theme,
      backgroundColor: 'transparent',
      legend: {
        show: true,
        bottom: 0,
        textStyle: { color: theme.textStyle?.color }
      },
      tooltip: {
        trigger: 'item',
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        textStyle: { color: '#1A1D1F' },
        extraCssText: 'border-radius: 12px; border: 1px solid rgba(0,0,0,0.05); padding: 12px;',
        formatter: (params: any) => {
          return `
            <div style="display: flex; align-items: center; gap: 8px;">
              <div style="width: 10px; height: 10px; border-radius: 50%; background: ${params.color}"></div>
              <span style="font-weight: 800; font-size: 13px; color: #1A1D1F">${params.name}</span>
            </div>
            <div style="margin-top: 4px; font-weight: 600; font-size: 18px; color: #1A1D1F">${params.value} <span style="font-size: 11px; color: #6F767E">logs</span></div>
            <div style="font-size: 11px; font-weight: 700; color: #6F767E; margin-top: 2px">${params.percent}% of Total</div>
          `;
        }
      },
      series: [{
        name: this.seriesName(),
        type: 'pie',
        radius: ['50%', '75%'],
        center: ['50%', '45%'],
        avoidLabelOverlap: true,
        itemStyle: { borderRadius: 12, borderColor: theme.backgroundColor, borderWidth: 2 },
        label: { show: false, position: 'center' },
        emphasis: {
          label: { show: true, fontSize: 16, fontWeight: '900', color: theme.textStyle.color, formatter: '{b}' },
          itemStyle: { scale: true, scaleSize: 10 }
        },
        data: pieData
      }]
    } as any;
  }

  private buildBarOptions(theme: any, data: DistributionDataPoint[], colors: Record<string, string>): EChartsOption {
    const isPercentage = data.some(d => d.value > 1); // Check if data is already 0-100 or 0-1

    return {
      ...theme,
      backgroundColor: 'transparent',
      legend: {
        show: true,
        top: 0,
        right: 0,
        textStyle: { color: theme.textStyle?.color }
      },
      tooltip: {
        ...theme.tooltip,
        trigger: 'item',
        formatter: (p: any) => `<strong>${p.name}</strong>: ${p.value.toFixed(1)}${isPercentage ? '%' : ''}`
      },
      grid: { left: 15, right: 50, bottom: 15, top: 40, containLabel: true },
      xAxis: { type: 'value', max: isPercentage ? 100 : 1.0, show: false },
      yAxis: {
        type: 'category',
        data: data.map(r => r.label.charAt(0).toUpperCase() + r.label.slice(1)),
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { ...theme.yAxis?.axisLabel }
      },
      series: [{
        name: this.seriesName(),
        type: 'bar',
        barMaxWidth: 18,
        data: data.map(r => ({
          value: r.value,
          name: r.label.charAt(0).toUpperCase() + r.label.slice(1),
          itemStyle: {
            color: r.color || colors[r.label.toLowerCase()] || colors['neutral'],
            borderRadius: [0, 6, 6, 0]
          }
        })),
        label: {
          show: true,
          position: 'right' as any,
          formatter: (p: any) => `${p.value.toFixed(1)}${isPercentage ? '%' : ''}`,
          fontWeight: 700,
          fontSize: 11,
          color: 'inherit'
        },
        showBackground: true,
        backgroundStyle: { color: 'rgba(148,163,184,0.08)', borderRadius: [0, 6, 6, 0] },
        animationDuration: 1200,
        animationEasing: 'cubicOut' as any
      }]
    } as any;
  }
}
