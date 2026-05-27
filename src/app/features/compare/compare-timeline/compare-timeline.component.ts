import { Component, input, computed, inject, signal, effect, untracked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AnalysisSession, AudioAnalysisSession, TextAnalysisResult } from '../../../core/models/text-analysis.model';
import { ImageAnalysisSession } from '../../../core/models/image-analysis.model';
import { VideoAnalysisSession } from '../../../core/models/video-analysis.model';
import { EmotionTimelineComponent } from '../../../shared/components/emotion-charts/emotion-timeline/emotion-timeline.component';
import { TimelineDataPoint } from '../../../core/models/chart-data.model';
import { ColorSettingsService } from '../../../core/services/color-settings.service';
import { FormattingService } from '../../../core/services/formatting.service';
import { AnalysisSectionHeaderComponent } from '../../../shared/components/analysis-section-header/analysis-section-header.component';
import { SegmentedNavComponent } from '../../../shared/components/segmented-nav/segmented-nav.component';


@Component({
  selector: 'app-compare-timeline',
  standalone: true,
  imports: [CommonModule, EmotionTimelineComponent, AnalysisSectionHeaderComponent],

  templateUrl: './compare-timeline.component.html',
  styleUrls: ['./compare-timeline.component.css']
})
export class CompareTimelineComponent {
   private colorSettings = inject(ColorSettingsService);
  protected format = inject(FormattingService);

  analysisA = input.required<AnalysisSession | AudioAnalysisSession | ImageAnalysisSession | VideoAnalysisSession | null>();
  analysisB = input.required<AnalysisSession | AudioAnalysisSession | ImageAnalysisSession | VideoAnalysisSession | null>();
  target = input<string>('overall');

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
    const target = this.target();
    const type = session.type;

    if (type === 'image') {
      const res = session.result;
      const probs: any = {};
      let label = 'Image';
      let tooltip = 'Static Scene Analysis';

      if (target === 'overall') {
        probs[res.scene_emotion.label.toLowerCase()] = res.scene_emotion.confidence;
      } else {
        const faceIdx = parseInt(target.split('_')[1]);
        const face = res.faces?.[faceIdx];
        if (!face) return []; 

        face.combined_results.forEach((r: any) => {
          probs[r.label.toLowerCase()] = r.confidence;
        });
        label = `Face ${faceIdx + 1}`;
        tooltip = `Face ${faceIdx + 1} Analysis`;
      }
      
      return [{ label, probabilities: probs, tooltipDetail: tooltip }];
    }

    const timeline = this.getTimelineRaw(session);

    return timeline.map((entry: any, i: number) => {
      let label = '';
      let tooltip = '';

      if (type === 'text') {
        label = `S${i + 1}`;
        tooltip = entry.sentence;
      } else if (type === 'audio') {
        label = `${entry.timestamp_offset?.toFixed(1) || i}s`;
        tooltip = `Time: ${label}`;
      } else if (type === 'video') {
        label = `${entry.timestamp_sec?.toFixed(1) || i}s`;
        tooltip = `Frame: ${entry.frame_index} [${label}]`;
      }

      return {
        label,
        probabilities: entry.probabilities as any,
        tooltipDetail: tooltip
      };
    });
  }

  private getTimelineRaw(session: any): any[] {
    const target = this.target();
    const type = session.type;

    if (type === 'text') {
      return (session.result as TextAnalysisResult).sentences_analysis || [];
    } else if (type === 'audio') {
      return session.result.audio_emotion?.timeline || [];
    } else if (type === 'video') {
      if (target === 'overall') {
        const res = session.result;
        return [{
          timestamp_sec: 0,
          frame_index: 0,
          probabilities: { [res.scene_emotion.label.toLowerCase()]: res.scene_emotion.confidence },
          dominant: res.scene_emotion
        }];
      } else {
        const faceIdx = parseInt(target.split('_')[1]);
        return session.result.faces?.[faceIdx]?.timeline || [];
      }
    }
    return [];
  }

  private getDominantEmotion(session: any): string {
    const target = this.target();
    const type = session.type;

    if (type === 'text') {
      return (session.result as TextAnalysisResult).combined_final_emotion.label.toLowerCase();
    } else if (type === 'audio') {
      return session.result.final_multimodal_emotion.label.toLowerCase();
    } else {
      // Image or Video
      if (target === 'overall') {
        return session.result.scene_emotion.label.toLowerCase();
      } else {
        const faceIdx = parseInt(target.split('_')[1]);
        const face = session.result.faces?.[faceIdx];
        return face?.combined_final_emotion?.label?.toLowerCase() || 'neutral';
      }
    }
  }
}
