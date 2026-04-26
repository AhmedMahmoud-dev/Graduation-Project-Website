import { Component, Input, ViewEncapsulation } from '@angular/core';


@Component({
  selector: 'app-empty-state',
  standalone: true,
  imports: [],
  templateUrl: './empty-state.component.html',
  styleUrls: ['./empty-state.component.css'],
  encapsulation: ViewEncapsulation.None
})
export class EmptyStateComponent {
  @Input() minHeight = 'auto';
  @Input() isFullPage = false;
}
