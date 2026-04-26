import { Component, input, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AnalysisSession, AudioAnalysisSession, TextAnalysisResult } from '../../../core/models/text-analysis.model';
import { EmotionTimelineComponent } from '../../../shared/components/emotion-charts/emotion-timeline/emotion-timeline.component';
import { TimelineDataPoint } from '../../../core/models/chart-data.model';
import { ColorSettingsService } from '../../../core/services/color-settings.service';

@Component({
  selector: 'app-compare-timeline',
  standalone: true,
  imports: [CommonModule, EmotionTimelineComponent],
  templateUrl: './compare-timeline.component.html',
  styleUrls: ['./compare-timeline.component.css']
})
export class CompareTimelineComponent {
  private colorSettings = inject(ColorSettingsService);
  analysisA = input.required<AnalysisSession | AudioAnalysisSession | null>();
  analysisB = input.required<AnalysisSession | AudioAnalysisSession | null>();

  timelineDataA = computed<TimelineDataPoint[]>(() => {
    const a = this.analysisA();
    return a ? this.mapToTimelineData(a) : [];
  });

  timelineDataB = computed<TimelineDataPoint[]>(() => {
    const b = this.analysisB();
    return b ? this.mapToTimelineData(b) : [];
  });

  dominantA = computed<string>(() => {
    const a = this.analysisA();
    return a ? this.getDominantEmotion(a) : '';
  });

  dominantB = computed<string>(() => {
    const b = this.analysisB();
    return b ? this.getDominantEmotion(b) : '';
  });

  private mapToTimelineData(session: any): TimelineDataPoint[] {
    const timeline = this.getTimelineRaw(session);
    const isText = session.type === 'text';

    return timeline.map((entry: any, i: number) => ({
      label: isText ? `S${i + 1}` : `${entry.timestamp_offset?.toFixed(1) || i}s`,
      probabilities: entry.probabilities as any,
      tooltipDetail: isText ? entry.sentence : `Time: ${entry.timestamp_offset?.toFixed(1) || i}s`
    }));
  }

  private getTimelineRaw(session: any): any[] {
    if (session.type === 'text') {
      return (session.result as TextAnalysisResult).sentences_analysis || [];
    }
    return session.result.audio_emotion?.timeline || [];
  }

  private getDominantEmotion(session: any): string {
    if (session.type === 'text') {
      return (session.result as TextAnalysisResult).combined_final_emotion.label.toLowerCase();
    }
    return session.result.final_multimodal_emotion.label.toLowerCase();
  }

  getEmotionColor(emotion: string): string {
    return this.colorSettings.emotionColors()[emotion.toLowerCase()] || this.colorSettings.emotionColors()['neutral'];
  }
}
