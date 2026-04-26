import { Component, input } from '@angular/core';

import { EmotionIconComponent } from '../../emotion-icon/emotion-icon.component';

@Component({
  selector: 'app-analysis-loading',
  standalone: true,
  imports: [EmotionIconComponent],
  templateUrl: './analysis-loading.component.html',
  styleUrl: './analysis-loading.component.css'
})
export class AnalysisLoadingComponent {
  /** Current progress value (0-100) */
  progress = input.required<number>();

  /** Current loading step description text */
  stepText = input.required<string>();

  /** Whether to show the brain icon (text analysis uses it) */
  showBrainIcon = input<boolean>(false);
}
