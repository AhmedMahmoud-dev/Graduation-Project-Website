import { Component, input, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AnalysisSession, AudioAnalysisSession, TextAnalysisResult } from '../../../core/models/text-analysis.model';
import { ColorSettingsService } from '../../../core/services/color-settings.service';
import { EmotionDistributionComponent } from '../../../shared/components/emotion-charts/emotion-distribution/emotion-distribution.component';
import { DistributionDataPoint } from '../../../core/models/chart-data.model';
import { AnalysisSectionHeaderComponent } from '../../../shared/components/analysis-section-header/analysis-section-header.component';


@Component({
  selector: 'app-compare-distribution',
  standalone: true,
  imports: [CommonModule, EmotionDistributionComponent, AnalysisSectionHeaderComponent],

  templateUrl: './compare-distribution.component.html',
  styleUrls: ['./compare-distribution.component.css']
})
export class CompareDistributionComponent {
  private colorSettings = inject(ColorSettingsService);

  analysisA = input.required<AnalysisSession | AudioAnalysisSession | null>();
  analysisB = input.required<AnalysisSession | AudioAnalysisSession | null>();

  // Fixed order for comparison
  readonly FIXED_ORDER = ['fear', 'sadness', 'anger', 'disgust', 'neutral', 'surprise', 'joy'];

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

    const negativeEmotions = ['fear', 'sadness', 'anger', 'disgust'];
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
    if (session.type === 'text') {
      return (session.result as TextAnalysisResult).full_text_analysis.probabilities;
    }
    return session.result.audio_emotion?.combined_probs_obj || this.mapFloatArrayToObj(session.result.audio_emotion.combined_probs);
  }

  private mapFloatArrayToObj(arr: number[]): any {
    // anger, disgust, fear, joy, neutral, sadness, surprise
    return {
      anger: arr[0], disgust: arr[1], fear: arr[2], joy: arr[3], neutral: arr[4], sadness: arr[5], surprise: arr[6]
    };
  }
}
