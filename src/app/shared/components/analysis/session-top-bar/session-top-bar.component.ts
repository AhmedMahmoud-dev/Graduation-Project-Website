import { Component, input, output, signal, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../../core/services/auth.service';
import { AnalysisV2Service } from '../../../../core/services/analysis-v2.service';
import { ToastService } from '../../../../core/services/toast.service';
import { AppCacheService } from '../../../../core/services/app-cache.service';
import { AppIconComponent } from '../../../../shared/components/app-icon/app-icon.component';

@Component({
  selector: 'app-session-top-bar',
  standalone: true,
  imports: [CommonModule, AppIconComponent],
  templateUrl: './session-top-bar.component.html',
  styleUrl: './session-top-bar.component.css'
})
export class SessionTopBarComponent implements OnInit, OnDestroy {
  /** The full session ID string */
  sessionId = input.required<string>();

  /** Emitted when "← New Analysis" is clicked */
  newAnalysis = output<void>();

  private authService = inject(AuthService);
  private analysisV2Service = inject(AnalysisV2Service);
  private toastService = inject(ToastService);
  private cache = inject(AppCacheService);

  isAuthenticated = signal<boolean>(false);
  isShared = signal<boolean>(false);
  shareToken = signal<string>('');
  
  copiedId = signal<boolean>(false);
  copiedLink = signal<boolean>(false);

  // Share Modal States
  isShareModalOpen = signal<boolean>(false);
  selectedOption = signal<'private' | 'public'>('private');

  private readonly CACHE_KEY = 'emotra_shared_links';

  ngOnInit() {
    this.isAuthenticated.set(this.authService.isAuthenticated());

    if (this.isAuthenticated()) {
      this.checkSharingStatus();
    }
  }

  private checkSharingStatus() {
    this.analysisV2Service.getSharedAnalyses().subscribe({
      next: (res) => {
        if (res.is_success && res.data) {
          // Update the cache so the settings page has the latest list instantly
          this.cache.setItem(this.CACHE_KEY, res.data);

          const match = res.data.find(item => item.client_id === this.sessionId());
          if (match) {
            this.isShared.set(true);
            this.shareToken.set(match.share_token);
            this.selectedOption.set('public');
          } else {
            this.isShared.set(false);
            this.shareToken.set('');
            this.selectedOption.set('private');
          }
        }
      }
    });
  }

  copySessionId() {
    navigator.clipboard.writeText(this.sessionId()).then(() => {
      this.copiedId.set(true);
      setTimeout(() => this.copiedId.set(false), 2000);
    });
  }

  openShareModal() {
    // Re-sync with actual status
    if (this.isShared()) {
      this.selectedOption.set('public');
    } else {
      this.selectedOption.set('private');
    }
    this.isShareModalOpen.set(true);
    document.body.style.overflow = 'hidden';
  }

  closeShareModal() {
    this.isShareModalOpen.set(false);
    document.body.style.overflow = '';
  }

  ngOnDestroy() {
    // Ensure body scroll is restored if component is destroyed
    document.body.style.overflow = '';
  }

  selectPrivate() {
    if (!this.isShared()) {
      this.selectedOption.set('private');
      return;
    }

    // Direct toggle in modal
    this.revoke();
  }

  selectPublic() {
    if (this.isShared()) {
      this.selectedOption.set('public');
      return;
    }

    // Call API to generate share link
    this.createShareLink();
  }

  createShareLink() {
    this.analysisV2Service.shareAnalysis(this.sessionId()).subscribe({
      next: (res) => {
        if (res.is_success && res.data) {
          this.isShared.set(true);
          this.shareToken.set(res.data.share_token);
          this.selectedOption.set('public');
          
          // Clear cache key so settings tab fetches fresh
          this.cache.removeItem(this.CACHE_KEY);
        } else {
          this.toastService.show('Error', res.message || 'Failed to create share link.', 'error', 'error');
        }
      },
      error: () => {
        this.toastService.show('Error', 'Failed to create share link.', 'error', 'error');
      }
    });
  }

  getShareUrl(): string {
    return `${window.location.origin}/shared-analysis/${this.shareToken()}`;
  }

  copyLink() {
    if (!this.shareToken()) return;
    const fullUrl = this.getShareUrl();
    navigator.clipboard.writeText(fullUrl).then(() => {
      this.copiedLink.set(true);
      setTimeout(() => this.copiedLink.set(false), 2000);
    });
  }

  revoke() {
    this.analysisV2Service.revokeShare(this.sessionId()).subscribe({
      next: (res) => {
        if (res.is_success) {
          this.isShared.set(false);
          this.shareToken.set('');
          this.selectedOption.set('private');
          
          // Clear cache key so settings tab fetches fresh
          this.cache.removeItem(this.CACHE_KEY);
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
