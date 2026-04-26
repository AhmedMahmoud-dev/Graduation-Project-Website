import { Injectable, inject, computed } from '@angular/core';
import { ThemeService } from './theme.service';

@Injectable({
  providedIn: 'root'
})
export class ChartThemeService {
  private themeService = inject(ThemeService);

  public getChartTheme = computed(() => {
    const isDark = this.themeService.resolvedTheme() === 'dark';

    return {
      textStyle: {
        fontFamily: 'DM Sans, sans-serif',
        color: isDark ? '#94a3b8' : '#64748b',
        fontSize: 12
      },
      title: {
        textStyle: {
          color: isDark ? '#f8fafc' : '#0f172a',
          fontWeight: 700
        }
      },
      legend: {
        textStyle: {
          color: isDark ? '#cbd5e1' : '#334155'
        }
      },
      tooltip: {
        backgroundColor: 'var(--bg-card)',
        borderColor: 'var(--border-color)',
        borderWidth: 1,
        textStyle: {
          color: 'var(--text-primary)',
          fontSize: 12
        },
        extraCssText: 'backdrop-filter: blur(12px); box-shadow: 0 10px 40px rgba(0,0,0,0.15); border-radius: 12px; padding: 12px 16px;'
      },
      xAxis: {
        axisLine: { lineStyle: { color: isDark ? '#1e293b' : '#e2e8f0' } },
        axisTick: { lineStyle: { color: isDark ? '#1e293b' : '#e2e8f0' } },
        splitLine: { lineStyle: { color: isDark ? '#0f172a' : '#f1f5f9', type: 'dashed' } },
        axisLabel: { color: isDark ? '#64748b' : '#94a3b8' }
      },
      yAxis: {
        axisLine: { show: false },
        axisTick: { show: false },
        splitLine: { lineStyle: { color: isDark ? '#1e293b' : '#e2e8f0', type: 'dashed' } },
        axisLabel: { color: isDark ? '#64748b' : '#94a3b8' }
      }
    };
  });
}
