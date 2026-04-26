import { Component, input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AnalysisSession, AudioAnalysisSession, TextAnalysisResult } from '../../../core/models/text-analysis.model';

@Component({
  selector: 'app-compare-hero',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './compare-hero.component.html',
  styleUrls: ['./compare-hero.component.css']
})
export class CompareHeroComponent {
  analysisA = input.required<AnalysisSession | AudioAnalysisSession | null>();
  analysisB = input.required<AnalysisSession | AudioAnalysisSession | null>();

  emotionA = computed(() => this.getDominantEmotion(this.analysisA()));
  emotionB = computed(() => this.getDominantEmotion(this.analysisB()));

  dateA = computed(() => this.analysisA() ? new Date(this.analysisA()!.timestamp) : null);
  dateB = computed(() => this.analysisB() ? new Date(this.analysisB()!.timestamp) : null);

  diffState = computed(() => {
    const a = this.emotionA();
    const b = this.emotionB();
    if (!a || !b) return null;

    const isSameEmotion = a.label === b.label;
    const confidenceDelta = b.confidence - a.confidence;

    // Shift Label Logic
    let shiftState: 'Improved' | 'Worsened' | 'Declined' | 'Stabilized' | 'No Change' | 'Similar' = 'Similar';
    
    if (a.label === b.label) {
      shiftState = 'No Change';
    } else if (a.category === 'negative' && b.category === 'positive') {
      shiftState = 'Improved';
    } else if (a.category === 'positive' && b.category === 'negative') {
      shiftState = 'Worsened';
    } else if (b.category === 'neutral') {
      shiftState = 'Stabilized';
    } else if (a.category === 'neutral' && b.category === 'negative') {
      shiftState = 'Declined';
    } else if (a.category === 'neutral' && b.category === 'positive') {
      shiftState = 'Improved';
    } else if (a.category === b.category) {
      shiftState = 'Similar';
    }

    // Delta Color Logic
    let deltaColor = 'var(--text-muted)';
    if (a.category === 'neutral' || b.category === 'neutral') {
      deltaColor = 'var(--text-muted)';
    } else if (a.category === 'negative' && b.category === 'positive') {
      deltaColor = 'var(--emotion-success)'; // improved
    } else if (a.category === 'positive' && b.category === 'negative') {
      deltaColor = 'var(--emotion-danger)';  // worsened
    } else if (a.category === 'negative' && b.category === 'negative') {
      deltaColor = 'var(--emotion-danger)';  // still negative
    } else if (a.category === 'positive' && b.category === 'positive') {
      deltaColor = 'var(--emotion-success)'; // still positive
    }

    return {
      isSameEmotion,
      shiftState,
      confidenceDelta,
      deltaColor
    };
  });

  private getDominantEmotion(session: any) {
    if (!session) return null;
    if (session.type === 'text') {
      const res = session.result as TextAnalysisResult;
      return {
        label: res.combined_final_emotion.label,
        confidence: res.combined_final_emotion.confidence_percent,
        category: res.combined_final_emotion.category
      };
    } else {
      const res = session.result.final_multimodal_emotion;
      return {
        label: res.label,
        confidence: res.confidence_percent,
        category: res.category
      };
    }
  }

  getEmotionColor(label: string | undefined): string {
    return `var(--emotion-${label?.toLowerCase() || 'neutral'})`;
  }
}
