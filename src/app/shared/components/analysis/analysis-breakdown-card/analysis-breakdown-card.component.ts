import { Component, input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EmotionIconComponent } from '../../emotion-icon/emotion-icon.component';
import { EmotionColorService } from '../../../../core/services/emotion-color.service';

@Component({
  selector: 'app-analysis-breakdown-card',
  standalone: true,
  imports: [CommonModule, EmotionIconComponent],
  templateUrl: './analysis-breakdown-card.component.html',
  styleUrls: ['./analysis-breakdown-card.component.css']
})
export class AnalysisBreakdownCardComponent {
  colorService = inject(EmotionColorService);

  /** 1-based index for the numbered badge */
  index = input.required<number>();

  /** The dominant emotion label for this item */
  emotionLabel = input.required<string>();

  /** Confidence score (0–1 scale) */
  confidence = input.required<number>();

  /** Full probabilities map for mini-bars */
  probabilities = input.required<Record<string, number>>();

  /** For text analysis — the sentence text (shows as blockquote) */
  sentence = input<string | null>(null);

  /** For audio analysis — the timestamp offset in seconds */
  timestampOffset = input<number | null>(null);

  /** Intensity weight (shown in badge) */
  intensityWeight = input<number | null>(null);

  /** Whether the segment was detected as speech */
  isSpeech = input<boolean | null>(null);
}
