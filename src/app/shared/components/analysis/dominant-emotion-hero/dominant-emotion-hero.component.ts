import { Component, input, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EmotionIconComponent } from '../../emotion-icon/emotion-icon.component';
import { EmotionColorService } from '../../../../core/services/emotion-color.service';

@Component({
  selector: 'app-dominant-emotion-hero',
  standalone: true,
  imports: [CommonModule, EmotionIconComponent],
  templateUrl: './dominant-emotion-hero.component.html',
  styleUrl: './dominant-emotion-hero.component.css'
})
export class DominantEmotionHeroComponent {
  colorService = inject(EmotionColorService);

  /** The dominant emotion label (e.g. 'joy', 'sadness') */
  emotionLabel = input.required<string>();

  /** Confidence percentage (0-100) */
  confidencePercent = input.required<number>();

  /** Category label (e.g. 'positive', 'negative', 'neutral') */
  category = input.required<string>();

  /** Section title above the emotion name */
  sectionTitle = input<string>('Dominant Emotion');

  /** Whether to show the confidence progress bar */
  showConfidenceBar = input<boolean>(true);

  /** Optional truncation warning message */
  truncationWarning = input<string | null>(null);

  /** Computed hero card background */
  heroCardBg = computed(() => {
    const color = this.colorService.getColor(this.emotionLabel());
    return `color-mix(in srgb, ${color}, var(--bg-card) 92%)`;
  });
}
