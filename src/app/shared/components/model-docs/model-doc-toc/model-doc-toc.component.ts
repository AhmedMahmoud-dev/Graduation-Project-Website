import { Component, input, PLATFORM_ID, inject } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';

export interface TocItem {
  id: string;
  label: string;
}

@Component({
  selector: 'app-model-doc-toc',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './model-doc-toc.component.html',
  styleUrl: './model-doc-toc.component.css'
})
export class ModelDocTocComponent {
  items = input.required<TocItem[]>();
  activeId = input<string>('');
  sidebarLabel = input<string>('DOCUMENTATION');

  isMobileDropdownOpen = false;
  private isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  toggleDropdown(): void {
    this.isMobileDropdownOpen = !this.isMobileDropdownOpen;
  }

  scrollTo(id: string, event: Event): void {
    event.preventDefault();
    this.isMobileDropdownOpen = false; // Auto-close dropdown on mobile
    if (!this.isBrowser) return;

    const element = document.getElementById(id);
    if (element) {
      // On mobile (lg<1024px), the TOC is a dropdown.
      // Navbar (~64px) + Dropdown Header (~52px) = ~116px. We use 140px to safely clear both.
      const isMobile = window.innerWidth < 1024;
      const offset = isMobile ? 140 : 100;

      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
  }
}
