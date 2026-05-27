import { Injectable, inject } from '@angular/core';
import { EChartsOption } from 'echarts';
import { PlatformStats } from '../models/admin.model';
import { FormattingService } from './formatting.service';
import { DistributionDataPoint } from '../models/chart-data.model';

@Injectable({ providedIn: 'root' })
export class AdminChartService {
  private format = inject(FormattingService);

  getAnalysesByTypeOptions(stats: PlatformStats, purple: string, blue: string, green: string, orange: string): DistributionDataPoint[] {
    if (!stats || !stats.analyses_by_type) return [];
    
    return Object.entries(stats.analyses_by_type).map(([label, value]) => {
      const lower = label.toLowerCase();
      const isAudio = lower === 'audio';
      const isText = lower === 'text';
      const isImage = lower === 'image';
      const isVideo = lower === 'video';
      
      let color: string | undefined = undefined;
      if (isAudio) color = purple;
      else if (isText) color = blue;
      else if (isImage) color = green;
      else if (isVideo) color = orange;

      return {
        label: label.charAt(0).toUpperCase() + label.slice(1),
        value,
        color
      };
    });
  }

  getTrendChartOptions(stats: PlatformStats, theme: any, brandPrimary: string, accent: string): EChartsOption {
    if (!stats || !stats.analysis_trend || !stats.new_users_trend) return {};

    const dates = stats.analysis_trend.map(t => this.format.formatShortDate(t.date));
    const newUsersDates = stats.new_users_trend.map(t => this.format.formatShortDate(t.date));

    const allDates = Array.from(new Set([...dates, ...newUsersDates])).sort();
    const dateToAnalysis = new Map(stats.analysis_trend.map(t => [this.format.formatShortDate(t.date), t.count]));
    const dateToUsers = new Map(stats.new_users_trend.map(t => [this.format.formatShortDate(t.date), t.count]));

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
  }

  getTypeTrendOptions(stats: PlatformStats, theme: any, purple: string, blue: string, green: string, orange: string): EChartsOption {
    if (!stats || !stats.analyses_by_type_trend) return {};

    const dates = stats.analyses_by_type_trend.map(t => this.format.formatShortDate(t.date));
    const textData = stats.analyses_by_type_trend.map(t => t.text_count);
    const audioData = stats.analyses_by_type_trend.map(t => t.audio_count);
    const imageData = stats.analyses_by_type_trend.map(t => t.image_count ?? 0);
    const videoData = stats.analyses_by_type_trend.map(t => t.video_count ?? 0);

    return {
      ...theme,
      backgroundColor: 'transparent',
      tooltip: { ...theme.tooltip, trigger: 'axis' },
      legend: { data: ['Text', 'Audio', 'Image', 'Video'], bottom: 0, textStyle: { ...theme.legend?.textStyle } },
      grid: { left: 12, right: 24, bottom: 40, top: 16, containLabel: true },
      xAxis: { ...theme.xAxis, type: 'category', boundaryGap: true, data: dates } as any,
      yAxis: { ...theme.yAxis, type: 'value' } as any,
      series: [
        {
          name: 'Text', type: 'bar', stack: 'total', barWidth: '40%',
          data: textData, itemStyle: { color: blue }
        },
        {
          name: 'Audio', type: 'bar', stack: 'total', barWidth: '40%',
          data: audioData, itemStyle: { color: purple }
        },
        {
          name: 'Image', type: 'bar', stack: 'total', barWidth: '40%',
          data: imageData, itemStyle: { color: green }
        },
        {
          name: 'Video', type: 'bar', stack: 'total', barWidth: '40%',
          data: videoData, itemStyle: { color: orange, borderRadius: [4, 4, 0, 0] }
        }
      ]
    } as any;
  }
}
