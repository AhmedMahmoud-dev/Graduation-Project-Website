import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AnalysisV2Service } from '../../../../core/services/analysis-v2.service';
import { ToastService } from '../../../../core/services/toast.service';
import { FormattingService } from '../../../../core/services/formatting.service';
import { AppCacheService } from '../../../../core/services/app-cache.service';
import { ActiveShareResponseDto } from '../../../../core/models/share-feature.model';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { LoadingStateComponent } from '../../../../shared/components/loading-state/loading-state.component';
import { AppIconComponent } from '../../../../shared/components/app-icon/app-icon.component';

@Component({
  selector: 'app-shared-links',
  standalone: true,
  imports: [CommonModule, RouterLink, EmptyStateComponent, LoadingStateComponent, AppIconComponent],
  templateUrl: './shared-links.component.html',
  styleUrl: './shared-links.component.css'
})
export class SharedLinksComponent implements OnInit {
  private analysisV2Service = inject(AnalysisV2Service);
  private toastService = inject(ToastService);
  protected format = inject(FormattingService);
  private cache = inject(AppCacheService);

  private readonly CACHE_KEY = 'emotra_shared_links';

  sharedItems = signal<ActiveShareResponseDto[]>([]);
  isLoading = signal<boolean>(true);
  isRefreshing = signal<boolean>(false);
  copiedMap = signal<Record<string, boolean>>({});

  ngOnInit() {
    this.fetchSharedLinks();
  }

  fetchSharedLinks() {
    const cached = this.cache.getItem<ActiveShareResponseDto[]>(this.CACHE_KEY);
    if (cached) {
      this.sharedItems.set(cached);
      this.isLoading.set(false);
      this.isRefreshing.set(true);
    } else {
      this.isLoading.set(true);
      this.isRefreshing.set(false);
    }

    this.analysisV2Service.getSharedAnalyses().subscribe({
      next: (res) => {
        if (res.is_success && res.data) {
          this.sharedItems.set(res.data);
          this.cache.setItem(this.CACHE_KEY, res.data);
        } else {
          this.sharedItems.set([]);
          this.cache.setItem(this.CACHE_KEY, []);
        }
        this.isLoading.set(false);
        this.isRefreshing.set(false);
      },
      error: () => {
        this.isLoading.set(false);
        this.isRefreshing.set(false);
        this.toastService.show('Error', 'Failed to retrieve shared analyses.', 'error', 'error');
      }
    });
  }

  getShareUrl(shareToken: string): string {
    return `${window.location.origin}/shared-analysis/${shareToken}`;
  }

  copyLink(item: ActiveShareResponseDto) {
    const url = this.getShareUrl(item.share_token);
    navigator.clipboard.writeText(url).then(() => {
      this.copiedMap.update(map => ({ ...map, [item.share_token]: true }));
      setTimeout(() => {
        this.copiedMap.update(map => ({ ...map, [item.share_token]: false }));
      }, 2000);
    });
  }

  openLink(shareToken: string) {
    const url = this.getShareUrl(shareToken);
    window.open(url, '_blank');
  }

  revoke(item: ActiveShareResponseDto) {
    this.analysisV2Service.revokeShare(item.client_id).subscribe({
      next: (res) => {
        if (res.is_success) {
          // Remove the revoked link from local state and cache immediately
          const updated = this.sharedItems().filter(x => x.client_id !== item.client_id);
          this.sharedItems.set(updated);
          this.cache.setItem(this.CACHE_KEY, updated);
          
          this.fetchSharedLinks();
        } else {
          this.toastService.show('Error', res.message || 'Failed to deactivate share link.', 'error', 'error');
        }
      },
      error: () => {
        this.toastService.show('Error', 'Failed to deactivate share link.', 'error', 'error');
      }
    });
  }
}
