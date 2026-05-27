import { Component, inject, input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { QuotaStore } from '../../../core/stores/quota.store';

@Component({
  selector: 'app-quota-banner',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './quota-banner.component.html'
})
export class QuotaBannerComponent {
  private quotaStore = inject(QuotaStore);
  
  type = input.required<'text' | 'audio' | 'image' | 'video'>();

  isBlocked = computed(() => {
    const qType = this.type();
    return this.quotaStore[qType]()?.is_blocked ?? false;
  });

  resetDateFormatted = computed(() => {
    const resetDateStr = this.quotaStore.quota()?.reset_date;
    if (!resetDateStr) return 'next Monday';
    try {
      const date = new Date(resetDateStr);
      // Format dynamically: e.g. "Monday, June 1 at 12:00 AM"
      return date.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' }) +
             ' at ' +
             date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
    } catch {
      return 'next Monday at 00:00 UTC';
    }
  });

  analysisTypeName = computed(() => {
    const t = this.type();
    return t.charAt(0).toUpperCase() + t.slice(1);
  });
}
