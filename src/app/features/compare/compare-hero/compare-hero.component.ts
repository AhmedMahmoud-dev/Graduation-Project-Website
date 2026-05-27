import { Component, input, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AnalysisSession, AudioAnalysisSession, TextAnalysisResult } from '../../../core/models/text-analysis.model';
import { ImageAnalysisSession } from '../../../core/models/image-analysis.model';
import { VideoAnalysisSession } from '../../../core/models/video-analysis.model';
import { FormattingService } from '../../../core/services/formatting.service';

@Component({
  selector: 'app-compare-hero',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './compare-hero.component.html',
  styleUrls: ['./compare-hero.component.css']
})
export class CompareHeroComponent {
  protected format = inject(FormattingService);
  analysisA = input.required<AnalysisSession | AudioAnalysisSession | ImageAnalysisSession | VideoAnalysisSession | null>();
  analysisB = input.required<AnalysisSession | AudioAnalysisSession | ImageAnalysisSession | VideoAnalysisSession | null>();
  target = input<string>('overall');

  emotionA = computed(() => this.getDominantEmotion(this.analysisA()));
  emotionB = computed(() => this.getDominantEmotion(this.analysisB()));

  metaA = computed(() => this.getMeta(this.analysisA()));
  metaB = computed(() => this.getMeta(this.analysisB()));

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

  private getMeta(session: any) {
    if (!session) return null;
    if (session.type === 'image') {
      return {
        label: `${session.result.faces_detected} Faces`,
        subLabel: `${session.result.frame_quality.original_width}x${session.result.frame_quality.original_height}`
      };
    } else if (session.type === 'video') {
      return {
        label: `${session.result.faces_tracked} Tracks`,
        subLabel: this.formatDuration(session.result.duration_seconds)
      };
    } else if (session.type === 'audio') {
      return {
        label: 'Audio Stream',
        subLabel: this.formatDuration(session.durationSeconds)
      };
    } else if (session.type === 'text') {
      return {
        label: 'Text Analysis',
        subLabel: `${session.result.sentences_count} Sentences`
      };
    }
    return null;
  }

  private formatDuration(seconds: number): string {
    if (!seconds) return '0s';
    if (seconds < 60) return `${seconds.toFixed(1)}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs.toFixed(0)}s`;
  }

  private getDominantEmotion(session: any) {
    if (!session) return null;
    const target = this.target();

    if (session.type === 'text') {
      const res = session.result as TextAnalysisResult;
      return {
        label: res.combined_final_emotion.label,
        confidence: res.combined_final_emotion.confidence_percent,
        category: res.combined_final_emotion.category
      };
    } else if (session.type === 'audio') {
      const res = session.result.final_multimodal_emotion;
      return {
        label: res.label,
        confidence: res.confidence_percent,
        category: res.category
      };
    } else {
      // Image or Video: Use target
      if (target === 'overall') {
        const res = session.result.scene_emotion;
        return {
          label: res.label,
          confidence: res.confidence_percent,
          category: res.category
        };
      } else {
        const faceIdx = parseInt(target.split('_')[1]);
        const face = session.result.faces?.[faceIdx];
        if (!face) return null;
        const res = face.combined_final_emotion;
        return {
          label: res.label,
          confidence: res.confidence_percent,
          category: res.category
        };
      }
    }
  }

}
