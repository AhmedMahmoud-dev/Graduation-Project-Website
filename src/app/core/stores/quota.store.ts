import { Injectable, inject, signal, computed, Injector } from '@angular/core';
import { AnalysisV2Service } from '../services/analysis-v2.service';
import { UserQuotaStatus } from '../models/quota.model';
import { AppCacheService } from '../services/app-cache.service';

@Injectable({
  providedIn: 'root'
})
export class QuotaStore {
  private injector = inject(Injector);
  private cache = inject(AppCacheService);

  private readonly CACHE_KEY = 'emotra_quota';

  quota = signal<UserQuotaStatus | null>(null);
  isLoading = signal<boolean>(false);

  // Readonly computed properties for specific limits
  text = computed(() => this.quota()?.text ?? null);
  audio = computed(() => this.quota()?.audio ?? null);
  image = computed(() => this.quota()?.image ?? null);
  video = computed(() => this.quota()?.video ?? null);

  constructor() {
    // Rehydrate from cache if available
    const cached = this.cache.getItem<UserQuotaStatus>(this.CACHE_KEY);
    if (cached) {
      this.quota.set(cached);
    }
  }

  loadQuota(): void {
    this.isLoading.set(true);
    const analysisService = this.injector.get(AnalysisV2Service);
    analysisService.getQuota().subscribe({
      next: (res) => {
        if (res.is_success && res.data) {
          this.quota.set(res.data);
          this.cache.setItem(this.CACHE_KEY, res.data);
        }
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
      }
    });
  }

  clearQuota(): void {
    this.quota.set(null);
    this.cache.removeItem(this.CACHE_KEY);
  }
}
