import { Component, input, output, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppIconComponent } from '../app-icon/app-icon.component';

@Component({
  selector: 'app-search-input',
  standalone: true,
  imports: [CommonModule, AppIconComponent],
  templateUrl: './search-input.component.html',
  styleUrl: './search-input.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SearchInputComponent {
  placeholder = input<string>('Search...');
  value = input.required<string>();
  valueChange = output<string>();

  onInput(event: Event): void {
    const val = (event.target as HTMLInputElement).value;
    this.valueChange.emit(val);
  }

  onClear(): void {
    this.valueChange.emit('');
  }
}
