import { Component, input, computed, inject, signal, effect, untracked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AnalysisSession, AudioAnalysisSession, TextAnalysisResult } from '../../../core/models/text-analysis.model';
import { ImageAnalysisSession } from '../../../core/models/image-analysis.model';
import { VideoAnalysisSession } from '../../../core/models/video-analysis.model';
import { ColorSettingsService } from '../../../core/services/color-settings.service';
import { EmotionDistributionComponent } from '../../../shared/components/emotion-charts/emotion-distribution/emotion-distribution.component';
import { DistributionDataPoint } from '../../../core/models/chart-data.model';
import { AnalysisSectionHeaderComponent } from '../../../shared/components/analysis-section-header/analysis-section-header.component';
import { SegmentedNavComponent } from '../../../shared/components/segmented-nav/segmented-nav.component';


@Component({
  selector: 'app-compare-distribution',
  standalone: true,
  imports: [CommonModule, EmotionDistributionComponent, AnalysisSectionHeaderComponent, SegmentedNavComponent],

  templateUrl: './compare-distribution.component.html',
  styleUrls: ['./compare-distribution.component.css']
})
export class CompareDistributionComponent {
  private colorSettings = inject(ColorSettingsService);

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

  // Fixed order for comparison
  readonly FIXED_ORDER = ['fear', 'sadness', 'anger', 'disgust', 'contempt', 'neutral', 'surprise', 'joy'];

  distributionA = computed<DistributionDataPoint[]>(() => {
    const a = this.analysisA();
    if (!a) return [];
    return this.mapToDistribution(this.getProbabilities(a));
  });

  distributionB = computed<DistributionDataPoint[]>(() => {
    const b = this.analysisB();
    if (!b) return [];
    return this.mapToDistribution(this.getProbabilities(b));
  });

  diffs = computed(() => {
    if (!this.analysisA() || !this.analysisB()) return [];
    const probsA = this.getProbabilities(this.analysisA());
    const probsB = this.getProbabilities(this.analysisB());

    const negativeEmotions = ['fear', 'sadness', 'anger', 'disgust', 'contempt'];
    const positiveEmotions = ['joy'];

    return this.FIXED_ORDER.map(emotion => {
      const valA = (probsA[emotion as keyof typeof probsA] || 0) * 100;
      const valB = (probsB[emotion as keyof typeof probsB] || 0) * 100;
      const delta = valB - valA;

      let status: 'improvement' | 'worsening' | 'neutral' = 'neutral';

      if (Math.abs(delta) < 0.001) {
        status = 'neutral';
      } else if (negativeEmotions.includes(emotion)) {
        status = delta > 0 ? 'worsening' : 'improvement';
      } else if (positiveEmotions.includes(emotion)) {
        status = delta > 0 ? 'improvement' : 'worsening';
      } else {
        status = 'neutral';
      }

      return {
        emotion,
        color: this.colorSettings.emotionColors()[emotion] || this.colorSettings.emotionColors()['neutral'],
        delta,
        status,
        formatted: delta > 0 ? `+${delta.toFixed(1)}%` : delta < 0 ? `${delta.toFixed(1)}%` : '='
      };
    });
  });

  private mapToDistribution(probs: any): DistributionDataPoint[] {
    const colors = this.colorSettings.emotionColors();
    return this.FIXED_ORDER.map(e => ({
      label: e,
      value: (probs[e as keyof typeof probs] || 0) * 100,
      color: colors[e] || colors['neutral']
    }));
  }

  private getProbabilities(session: any): any {
    const target = this.compareTarget();
    if (session.type === 'text') {
      return (session.result as TextAnalysisResult).full_text_analysis.probabilities;
    } else if (session.type === 'audio') {
      return session.result.audio_emotion?.combined_probs_obj || this.mapFloatArrayToObj(session.result.audio_emotion.combined_probs);
    } else {
      // Image or Video: Use selected face track combined_results if available
      if (target === 'overall') {
        const scene = session.result.scene_emotion;
        if (scene) {
          return { [scene.label.toLowerCase()]: scene.confidence };
        }
        return {};
      } else {
        const faceIdx = parseInt(target.split('_')[1]);
        const face = session.result.faces?.[faceIdx];
        const results = face?.combined_results;
        if (results && Array.isArray(results)) {
          const probs: any = {};
          results.forEach((r: any) => {
            probs[r.label.toLowerCase()] = r.confidence;
          });
          return probs;
        }
        return {};
      }
    }
  }

  private mapFloatArrayToObj(arr: number[]): any {
    // anger, disgust, fear, joy, neutral, sadness, surprise
    return {
      anger: arr[0], disgust: arr[1], fear: arr[2], joy: arr[3], neutral: arr[4], sadness: arr[5], surprise: arr[6]
    };
  }
}
