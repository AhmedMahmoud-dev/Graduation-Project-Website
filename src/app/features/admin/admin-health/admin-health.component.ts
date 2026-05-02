import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminService } from '../../../core/services/admin.service';
import { ServiceHealth } from '../../../core/models/admin.model';
import { AppCacheService } from '../../../core/services/app-cache.service';
import { FormattingService } from '../../../core/services/formatting.service';
import { LoadingStateComponent } from '../../../shared/components/loading-state/loading-state.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { PageHeaderComponent } from '../../../shared/components/layout/page-header/page-header.component';

const CACHE_KEY = 'emotra_admin_health';

@Component({
  selector: 'app-admin-health',
  standalone: true,
  imports: [CommonModule, LoadingStateComponent, EmptyStateComponent, PageHeaderComponent],
  templateUrl: './admin-health.component.html',
  styleUrl: './admin-health.component.css'
})
export class AdminHealthComponent implements OnInit {
  private adminService = inject(AdminService);
  private cache = inject(AppCacheService);
  protected format = inject(FormattingService);

  services = signal<ServiceHealth[]>([]);
  isLoading = signal<boolean>(true);
  error = signal<string | null>(null);
  isRefreshing = signal<boolean>(false);

  ngOnInit(): void {
    // 1. Check cache
    const cached = this.cache.getItem<ServiceHealth[]>(CACHE_KEY);
    
    if (cached && cached.length > 0) {
      this.services.set(cached);
      this.isLoading.set(false);
      // Background sync
      this.fetchHealth(true);
    } else {
      this.fetchHealth(false);
    }
  }

  fetchHealth(isBackground: boolean = false): void {
    if (!isBackground) {
      if (this.services().length === 0) {
        this.isLoading.set(true);
      } else {
        this.isRefreshing.set(true);
      }
    }
    this.error.set(null);

    this.adminService.getHealth().subscribe({
      next: (res) => {
        if (res.is_success && res.data) {
          this.services.set(res.data);
          this.cache.setItem(CACHE_KEY, res.data);
        } else {
          if (this.services().length === 0) {
            this.error.set(res.message || 'Failed to load service health.');
          }
        }
        this.isLoading.set(false);
        this.isRefreshing.set(false);
      },
      error: () => {
        if (this.services().length === 0) {
          this.error.set('Could not connect to the server.');
        }
        this.isLoading.set(false);
        this.isRefreshing.set(false);
      }
    });
  }

  isOnline(status: string): boolean {
    return status?.toLowerCase() === 'online' || status?.toLowerCase() === 'healthy';
  }

  getResponseClass(ms: number): string {
    if (ms < 200) return 'response-time--fast';
    if (ms < 500) return 'response-time--normal';
    return 'response-time--slow';
  }
}
