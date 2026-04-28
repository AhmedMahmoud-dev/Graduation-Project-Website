import { Component, input } from '@angular/core';
import { AnalysisSectionHeaderComponent } from '../../analysis-section-header/analysis-section-header.component';



export interface ModelInfoChip {
  label: string;
  value: string;
  mono?: boolean;
}

@Component({
  selector: 'app-model-info-grid',
  standalone: true,
  imports: [AnalysisSectionHeaderComponent],

  templateUrl: './model-info-grid.component.html',
  styleUrl: './model-info-grid.component.css'
})
export class ModelInfoGridComponent {
  /** Array of model info chips to display */
  chips = input.required<ModelInfoChip[]>();

  /** Section title */
  title = input<string>('Model Information');

  /** Small subtitle above title */
  subTitle = input<string>('Technical Details');

  /** Whether to show the header */
  showTitle = input<boolean>(true);

  /** Optional warning chip (e.g. truncation warning) */
  warningChip = input<{ label: string; value: string } | null>(null);
}
