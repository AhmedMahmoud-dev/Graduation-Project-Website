import { Component, input, output, signal, HostListener, ElementRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface DropdownOption {
  label: string;
  value: any;
  icon?: string; // Optional SVG or identifier
}

@Component({
  selector: 'app-dropdown-menu',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dropdown-menu.component.html',
  styleUrls: ['./dropdown-menu.component.css']
})
export class DropdownMenuComponent {
  private elementRef = inject(ElementRef);

  options = input.required<DropdownOption[]>();
  selectedValue = input<any>();
  placeholder = input<string>('Select...');
  disabled = input<boolean>(false);

  selectedValueChange = output<any>();

  isOpen = signal<boolean>(false);

  get selectedLabel(): string {
    const selected = this.options().find(opt => opt.value === this.selectedValue());
    return selected ? selected.label : this.placeholder();
  }

  toggle() {
    if (this.disabled()) return;
    this.isOpen.update(v => !v);
  }

  selectOption(value: any) {
    this.selectedValueChange.emit(value);
    this.isOpen.set(false);
  }

  @HostListener('document:click', ['$event'])
  onClickOutside(event: Event) {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.isOpen.set(false);
    }
  }
}
