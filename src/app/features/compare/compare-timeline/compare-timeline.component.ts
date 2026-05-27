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
  imports: [CommonModule, EmotionTimelineComponent, AnalysisSectionHeaderComponent, SegmentedNavComponent],

  templateUrl: './compare-timeline.component.html',
  styleUrls: ['./compare-timeline.component.css']
})
export class CompareTimelineComponent {
   private colorSettings = inject(ColorSettingsService);
  protected format = inject(FormattingService);

  analysisA = input.required<AnalysisSession | AudioAnalysisSession | ImageAnalysisSession | VideoAnalysisSession | null>();
  analysisB = input.required<AnalysisSession | AudioAnalysisSession | ImageAnalysisSession | VideoAnalysisSession | null>();

  // Target Selection (Overall vs Face X)
  compareTarget = signal<string>('overall');

  targetOptions = computed(() => {
    const a = this.analysisA();
    const b = this.analysisB();
    if (!a || !b) return [];

    const isMedia = a.type === 'image' || a.type === 'video';
    const options: {label: string, value: string}[] = [];
    
    const facesA = (a.type === 'image' || a.type === 'video') ? (a.result as any).faces?.length || 0 : 0;
    const facesB = (b.type === 'image' || b.type === 'video') ? (b.result as any).faces?.length || 0 : 0;
    const maxFaces = Math.max(facesA, facesB);

    if (isMedia) {
      // For media, only show overall/scene if no faces exist
      if (maxFaces === 0) {
        options.push({ label: 'Scene', value: 'overall' });
      }
    } else {
      options.push({ label: 'Overall', value: 'overall' });
    }
    
    for (let i = 0; i < maxFaces; i++) {
      options.push({ label: `Face ${i + 1}`, value: `face_${i}` });
    }
    
    return options;
  });

  constructor() {
    // Auto-switch target when changing analysis types
    effect(() => {
      const a = this.analysisA();
      if (!a) return;

      untracked(() => {
        const isMedia = a.type === 'image' || a.type === 'video';
        const currentTarget = this.compareTarget();
        const faces = (a.result as any).faces?.length || 0;

        if (isMedia) {
          if (currentTarget === 'overall' && faces > 0) {
            this.compareTarget.set('face_0');
          }
        } else {
          if (currentTarget.startsWith('face_')) {
            this.compareTarget.set('overall');
          }
        }
      });
    });
  }

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
    const target = this.compareTarget();
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
      
      // FIX: For static images, provide two identical points to force ECharts to draw horizontal lines
      const p1 = { label: label + ' (Start)', probabilities: probs, tooltipDetail: tooltip };
      const p2 = { label: label + ' (End)', probabilities: probs, tooltipDetail: tooltip };
      return [p1, p2];
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
    const target = this.compareTarget();
    const type = session.type;

    if (type === 'text') {
      return (session.result as TextAnalysisResult).sentences_analysis || [];
    } else if (type === 'audio') {
      return session.result.audio_emotion?.timeline || [];
    } else if (type === 'video') {
      if (target === 'overall') {
        // Fallback for video overall: show scene_emotion as single point
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
    const target = this.compareTarget();
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
