import { Component, inject, effect, PLATFORM_ID, Inject } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ShortcutService } from '../../../core/services/shortcut.service';

@Component({
  selector: 'app-shortcut-help',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './shortcut-help.component.html',
  styleUrl: './shortcut-help.component.css'
})
export class ShortcutHelpComponent {
  public shortcutService = inject(ShortcutService);
  private isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  isOpen = this.shortcutService.isHelpOpen;

  constructor() {
    effect(() => {
      if (this.isBrowser) {
        if (this.isOpen()) {
          document.body.classList.add('no-scroll');
          document.documentElement.classList.add('no-scroll');
        } else {
          document.body.classList.remove('no-scroll');
          document.documentElement.classList.remove('no-scroll');
        }
      }
    });
  }

  close(): void {
    this.shortcutService.closeHelpModal();
  }
}
