import { Component, Input, computed, signal } from '@angular/core';

@Component({
  selector: 'app-icon',
  standalone: true,
  imports: [],
  templateUrl: './app-icon.component.html',
  styleUrl: './app-icon.component.css',
})
export class AppIconComponent {
  /** The name of the icon (e.g. 'text', 'audio', 'globe', 'stats-logs') */
  @Input({ required: true }) set name(val: string | undefined | null) {
    this._name.set(val || 'text');
  }

  /** The size of the icon (number for px, or string like '2rem') */
  @Input() set size(val: number | string) {
    this._size.set(val);
  }

  /** Additional CSS classes for the SVG element */
  @Input() className: string = '';

  /** Stroke width for the icon */
  @Input() strokeWidth: number = 2;

  private _name = signal<string>('text');
  private _size = signal<number | string>(24);

  iconName = this._name.asReadonly();

  sizePx = computed(() => {
    const s = this._size();
    return typeof s === 'number' ? `${s}px` : (s || '24px');
  });
}
