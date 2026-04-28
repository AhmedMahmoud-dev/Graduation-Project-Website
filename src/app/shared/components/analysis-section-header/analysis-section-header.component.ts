import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-analysis-section-header',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './analysis-section-header.component.html',
  styleUrl: './analysis-section-header.component.css'
})
export class AnalysisSectionHeaderComponent {
  @Input({ required: true }) title!: string;
  @Input() subtitle?: string;
  @Input() description?: string;
  @Input() marginBottom: string = 'mb-8';
  @Input() center: boolean = false;
  @Input() variant: 'border' | 'pill' | 'none' = 'border';

}
