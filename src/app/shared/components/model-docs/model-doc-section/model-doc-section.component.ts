import { Component, input } from '@angular/core';


@Component({
  selector: 'app-model-doc-section',
  standalone: true,
  imports: [],
  templateUrl: './model-doc-section.component.html'
})
export class ModelDocSectionComponent {
  sectionId = input.required<string>();
  title = input.required<string>();
  subtitle = input<string>('');
}
