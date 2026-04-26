import { Component, input, signal, inject, computed } from '@angular/core';

import { EmotionColorService } from '../../../../core/services/emotion-color.service';

@Component({
  selector: 'app-raw-json-section',
  standalone: true,
  imports: [],
  templateUrl: './raw-json-section.component.html',
  styleUrl: './raw-json-section.component.css'
})
export class RawJsonSectionComponent {
  private colorService = inject(EmotionColorService);

  /** The raw result object to display as JSON */
  data = input.required<any>();

  showRaw = signal<boolean>(false);
  copiedJson = signal<boolean>(false);

  highlightedJson = computed(() => {
    return this.colorService.highlightJson(this.data());
  });

  toggleRaw() {
    this.showRaw.set(!this.showRaw());
  }

  copyJson() {
    navigator.clipboard.writeText(JSON.stringify(this.data(), null, 2)).then(() => {
      this.copiedJson.set(true);
      setTimeout(() => this.copiedJson.set(false), 2000);
    });
  }
}
