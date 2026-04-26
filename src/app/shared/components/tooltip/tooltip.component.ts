import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-tooltip',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './tooltip.component.html',
  styleUrl: './tooltip.component.css'
})
export class TooltipComponent {
  @Input() text: string = '';
  @Input() position: 'right' | 'left' | 'top' | 'bottom' = 'right';
  @Input() visible: boolean = false;
}
