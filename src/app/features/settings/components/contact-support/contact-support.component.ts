import { Component, inject, signal, OnInit, DestroyRef, computed, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { SupportService } from '../../../../core/services/support.service';
import { ToastService } from '../../../../core/services/toast.service';
import { FormattingService } from '../../../../core/services/formatting.service';
import { AlertsService } from '../../../../core/services/alerts.service';
import { SupportMessage } from '../../../../core/models/support.model';
import { LoadingStateComponent } from '../../../../shared/components/loading-state/loading-state.component';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { ChatBubble, ChatMessageGroup, flattenUserSupportMessages, groupMessagesByDate } from '../../../../core/utils/support-chat.util';

@Component({
  selector: 'app-contact-support',
  standalone: true,
  imports: [CommonModule, FormsModule, LoadingStateComponent, EmptyStateComponent],
  templateUrl: './contact-support.component.html',
  styleUrls: ['./contact-support.component.css']
})
export class ContactSupportComponent implements OnInit, AfterViewChecked {
  private supportService = inject(SupportService);
  private toastService = inject(ToastService);
  private formattingService = inject(FormattingService);
  private alertsService = inject(AlertsService);
  private destroyRef = inject(DestroyRef);

  @ViewChild('chatContainer') private chatContainer!: ElementRef;

  messages = signal<SupportMessage[]>([]);
  chatGroups = signal<ChatMessageGroup[]>([]);
  isLoading = signal(false);
  isLoadingMore = signal(false);
  isSending = signal(false);
  newMessage = signal('');

  totalCount = signal<number>(0);
  currentPage = signal<number>(1);
  readonly pageSize = 15; // Load larger batches for a more seamless scroll history

  canLoadMore = computed(() => this.messages().length < this.totalCount());
  remainingCount = computed(() => this.totalCount() - this.messages().length);
  
  private shouldScrollToBottom = false;

  ngOnInit() {
    this.loadMessages();
    this.setupRealTimeListener();
  }

  ngAfterViewChecked() {
    if (this.shouldScrollToBottom) {
      this.scrollToBottom();
      this.shouldScrollToBottom = false;
    }
  }

  private setupRealTimeListener() {
    this.alertsService.alert$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((alert) => {
        if (alert.type === 'support_reply' || alert.type === 'SupportReply') {
          // Reload messages and scroll to bottom for real-time replies
          this.loadMessages(false, true);
        }
      });
  }

  loadMessages(isLoadMore: boolean = false, forceScrollToBottom: boolean = false) {
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
            // Keep current scroll height offset before content prepend
            const el = this.chatContainer?.nativeElement;
            const previousScrollHeight = el ? el.scrollHeight : 0;
            const previousScrollTop = el ? el.scrollTop : 0;

            this.messages.update(prev => [...prev, ...res.data!]);
            this.updateChatGroups();

            // Maintain scroll position after prepending older messages
            setTimeout(() => {
              if (el) {
                el.scrollTop = previousScrollTop + (el.scrollHeight - previousScrollHeight);
              }
            }, 50);
          } else {
            this.messages.set(res.data);
            this.updateChatGroups();
            this.shouldScrollToBottom = true;
          }
        }
        this.isLoading.set(false);
        this.isLoadingMore.set(false);
        if (forceScrollToBottom) {
          this.shouldScrollToBottom = true;
        }
      },
      error: () => {
        this.isLoading.set(false);
        this.isLoadingMore.set(false);
      }
    });
  }

  private updateChatGroups() {
    const flat = flattenUserSupportMessages(this.messages());
    const grouped = groupMessagesByDate(flat);
    this.chatGroups.set(grouped);
  }

  loadMore() {
    if (this.isLoadingMore() || !this.canLoadMore()) return;
    this.currentPage.update(p => p + 1);
    this.loadMessages(true);
  }

  onScroll(event: Event): void {
    const el = event.target as HTMLElement;
    // When user scrolls to top, load older messages automatically
    if (el.scrollTop === 0 && this.canLoadMore() && !this.isLoadingMore()) {
      this.loadMore();
    }
  }

  submitMessage() {
    const text = this.newMessage().trim();
    if (!text || this.isSending()) return;

    this.isSending.set(true);
    
    // Automatically generate a clean subject name under the hood
    const subject = `Support Ticket #${Date.now().toString().slice(-6)}`;
    
    this.supportService.submitMessage({ subject, message: text }).subscribe({
      next: (res) => {
        this.isSending.set(false);
        this.newMessage.set('');
        
        // Reload history (getting page 1) and force scroll to the bottom to see new message
        this.currentPage.set(1);
        this.loadMessages(false, true);
      },
      error: (err) => {
        this.isSending.set(false);
        const errorMsg = err.error?.message || 'Failed to send message. Please try again.';
        this.toastService.show('Error', errorMsg, 'error', 'error');
      }
    });
  }

  scrollToBottom(): void {
    try {
      if (this.chatContainer) {
        const el = this.chatContainer.nativeElement;
        el.scrollTop = el.scrollHeight;
      }
    } catch (err) {
      console.error('Scroll error:', err);
    }
  }

  formatDate(dateStr: string | null): string {
    return this.formattingService.formatDate(dateStr);
  }
}

