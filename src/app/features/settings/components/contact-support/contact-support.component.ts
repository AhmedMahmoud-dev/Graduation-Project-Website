import { Component, inject, signal, OnInit, DestroyRef, computed, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { SupportService } from '../../../../core/services/support.service';
import { ToastService } from '../../../../core/services/toast.service';
import { FormattingService } from '../../../../core/services/formatting.service';
import { AlertsService } from '../../../../core/services/alerts.service';
import { Router } from '@angular/router';
import { SupportMessage, SupportPagedResponse } from '../../../../core/models/support.model';
import { LoadingStateComponent } from '../../../../shared/components/loading-state/loading-state.component';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { SegmentedNavComponent, SegmentedNavOption } from '../../../../shared/components/segmented-nav/segmented-nav.component';
import { LoadMoreComponent } from '../../../../shared/components/load-more/load-more.component';

@Component({
  selector: 'app-contact-support',
  standalone: true,
  imports: [CommonModule, FormsModule, LoadingStateComponent, EmptyStateComponent, SegmentedNavComponent, LoadMoreComponent],
  templateUrl: './contact-support.component.html',
  styleUrls: ['./contact-support.component.css']
})
export class ContactSupportComponent implements OnInit, OnChanges {
  private supportService = inject(SupportService);
  private toastService = inject(ToastService);
  private formattingService = inject(FormattingService);
  private alertsService = inject(AlertsService);
  private destroyRef = inject(DestroyRef);
  private router = inject(Router);

  @Input() initialTab: 'form' | 'history' = 'form';

  messages = signal<SupportMessage[]>([]);
  isLoading = signal(false);
  isLoadingMore = signal(false);
  isSending = signal(false);
  subject = signal('');
  message = signal('');
  activeView = signal<'form' | 'history'>('form');

  totalCount = signal<number>(0);
  currentPage = signal<number>(1);
  readonly pageSize = 10;

  canLoadMore = computed(() => this.messages().length < this.totalCount());
  remainingCount = computed(() => this.totalCount() - this.messages().length);

  navOptions = signal<SegmentedNavOption[]>([
    { label: 'Send Message', value: 'form' },
    { label: 'My Messages', value: 'history' }
  ]);

  ngOnInit() {
    // Apply initial tab from route
    this.activeView.set(this.initialTab);
    this.loadMessages();
    this.setupRealTimeListener();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['initialTab'] && !changes['initialTab'].firstChange) {
      this.activeView.set(changes['initialTab'].currentValue);
    }
  }

  setActiveView(tab: 'form' | 'history') {
    this.activeView.set(tab);
    this.router.navigate(['/settings/support', tab], { replaceUrl: true });
  }

  private setupRealTimeListener() {
    this.alertsService.alert$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((alert) => {
        // If we get a support reply alert, reload the message history instantly
        if (alert.type === 'support_reply' || alert.type === 'SupportReply') {
          this.loadMessages();
        }
      });
  }

  loadMessages(isLoadMore: boolean = false) {
    if (isLoadMore) {
      this.isLoadingMore.set(true);
    } else {
      this.isLoading.set(true);
      this.currentPage.set(1);
    }

    this.supportService.getMyMessages(this.currentPage(), this.pageSize).subscribe({
      next: (res) => {
        if (res.is_success && res.data) {
          this.totalCount.set(res.total);
          if (isLoadMore) {
            this.messages.update(prev => [...prev, ...res.data!]);
          } else {
            this.messages.set(res.data);
          }
        }
        this.isLoading.set(false);
        this.isLoadingMore.set(false);
      },
      error: () => {
        this.isLoading.set(false);
        this.isLoadingMore.set(false);
      }
    });
  }

  loadMore() {
    if (this.isLoadingMore()) return;
    this.currentPage.update(p => p + 1);
    this.loadMessages(true);
  }

  submitMessage() {
    const sub = this.subject().trim();
    const msg = this.message().trim();

    if (!sub || !msg) {
      this.toastService.show('Missing Fields', 'Please enter both a subject and a message.', 'warning', 'info');
      return;
    }

    this.isSending.set(true);
    this.supportService.submitMessage({ subject: sub, message: msg }).subscribe({
      next: (res) => {
        this.isSending.set(false);
        this.toastService.show('Message Sent', 'Your support request has been submitted successfully.', 'success', 'check');
        
        // Clear form
        this.subject.set('');
        this.message.set('');
        
        // Reload history and switch view
        this.loadMessages();
        this.setActiveView('history');
      },
      error: (err) => {
        this.isSending.set(false);
        const errorMsg = err.error?.message || 'Failed to send message. Please try again.';
        this.toastService.show('Error', errorMsg, 'error', 'error');
      }
    });
  }

  formatDate(dateStr: string | null): string {
    return this.formattingService.formatDate(dateStr);
  }
}
