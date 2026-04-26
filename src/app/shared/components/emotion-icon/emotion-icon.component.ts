import { Component, Input, computed, signal } from '@angular/core';


const EMOTION_COLORS: Record<string, string> = {
  anger: 'var(--emotion-anger)',
  disgust: 'var(--emotion-disgust)',
  fear: 'var(--emotion-fear)',
  joy: 'var(--emotion-joy)',
  neutral: 'var(--emotion-neutral)',
  sadness: 'var(--emotion-sadness)',
  surprise: 'var(--emotion-surprise)',
  positive: 'var(--color-success)',
  negative: 'var(--color-danger)',
  brain: 'var(--color-brain)',
};

@Component({
  selector: 'app-emotion-icon',
  standalone: true,
  imports: [],
  templateUrl: './emotion-icon.component.html',
  styleUrl: './emotion-icon.component.css',
})
export class EmotionIconComponent {
  /** The emotion label (e.g. 'joy', 'sadness', 'positive', 'negative') */
  @Input({ required: true }) set emotion(val: string | undefined | null) {
    this._emotionLabel.set(val || 'neutral');
  }

  /** The size of the icon (number for px, or string like '2rem') */
  @Input() set size(val: number | string) { this._size.set(val); }

  /** Force a specific color (e.g. '#ff0000'). If not provided, it maps from the theme. */
  @Input() color: string | null = null;

  /** Additional CSS classes for the SVG element */
  @Input() className: string = '';

  private _emotionLabel = signal<string>('neutral');
  private _size = signal<number | string>(24);

  emotionLabel = this._emotionLabel.asReadonly();

  sizePx = computed(() => {
    const s = this._size();
    return typeof s === 'number' ? `${s}px` : (s || '24px');
  });

  resolvedColor = computed(() => {
    if (this.color) return this.color;
    const label = this._emotionLabel().toLowerCase();
    return EMOTION_COLORS[label] || 'currentColor';
  });
}
