import { Component, input } from '@angular/core';
import { AnalysisSectionHeaderComponent } from '../../analysis-section-header/analysis-section-header.component';



@Component({
  selector: 'app-model-doc-section',
  standalone: true,
  imports: [AnalysisSectionHeaderComponent],

  templateUrl: './model-doc-section.component.html'
})
export class ModelDocSectionComponent {
  sectionId = input.required<string>();
  title = input.required<string>();
  subtitle = input<string>('');
}
