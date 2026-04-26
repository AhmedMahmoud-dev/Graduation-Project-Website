import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-loading-state',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './loading-state.component.html',
  styleUrls: ['./loading-state.component.css']
})
export class LoadingStateComponent {
  message = input<string>('Loading Data...');
  size = input<'sm' | 'md' | 'lg'>('md');
  fullPage = input<boolean>(false);
}
