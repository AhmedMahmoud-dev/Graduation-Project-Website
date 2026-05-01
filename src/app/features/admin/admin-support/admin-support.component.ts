import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminSupportService } from '../../../core/services/admin-support.service';
import { ToastService } from '../../../core/services/toast.service';
import { FormattingService } from '../../../core/services/formatting.service';
import { AdminSupportMessage } from '../../../core/models/support.model';
import { LoadingStateComponent } from '../../../shared/components/loading-state/loading-state.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { PageHeaderComponent } from '../../../shared/components/layout/page-header/page-header.component';
import { AppCacheService } from '../../../core/services/app-cache.service';
import { useTableSort } from '../../../core/utils/sort.util';
import { DropdownMenuComponent, DropdownOption } from '../../../shared/components/dropdown-menu/dropdown-menu.component';

const CACHE_KEY = 'emotra_admin_support';

@Component({
  selector: 'app-admin-support',
  standalone: true,
  imports: [CommonModule, FormsModule, LoadingStateComponent, EmptyStateComponent, PageHeaderComponent, DropdownMenuComponent],
  templateUrl: './admin-support.component.html',
  styleUrls: ['./admin-support.component.css']
})
export class AdminSupportComponent implements OnInit {
  private adminSupportService = inject(AdminSupportService);
  private toastService = inject(ToastService);
  protected format = inject(FormattingService);
  private cache = inject(AppCacheService);

  messages = signal<AdminSupportMessage[]>([]);

  // Sorting
  sortState = useTableSort<AdminSupportMessage>(this.messages);
  sortedMessages = this.sortState.sortedData;

  totalMessages = signal<number>(0);
  pendingMessagesCount = computed(() => this.messages().filter(m => m.status === 'open' || m.status === 'pending').length);
  isLoading = signal(true);
  error = signal<string | null>(null);

  // Interaction State
  expandedMessageId = signal<number | null>(null);
  isReplying = signal<number | null>(null);
  replyText = signal<Record<number, string>>({});

  ngOnInit() {
    const cached = this.cache.getItem<AdminSupportMessage[]>(CACHE_KEY);
    if (cached) {
      this.messages.set(cached);
      this.totalMessages.set(cached.length);
      this.isLoading.set(false);
    } else {
      this.fetchMessages();
    }
  }

  fetchMessages() {
    this.isLoading.set(true);
    this.error.set(null);
    this.adminSupportService.getMessages(1, 100).subscribe({
      next: (res) => {
        if (res.is_success && res.data) {
          const data = res.data;
          let items: AdminSupportMessage[] = [];

          if (Array.isArray(data)) {
            items = data;
          } else if (data.items) {
            items = data.items;
          }

          this.messages.set(items);
          this.totalMessages.set(items.length);
          this.cache.setItem(CACHE_KEY, items);
        }
        this.isLoading.set(false);
      },
      error: (err) => {
        this.error.set(err.message || 'Failed to load support queue');
        this.isLoading.set(false);
      }
    });
  }

  toggleMessage(id: number) {
    if (this.expandedMessageId() === id) {
      this.expandedMessageId.set(null);
    } else {
      this.expandedMessageId.set(id);
    }
  }

  submitReply(id: number) {
    const reply = this.replyText()[id]?.trim();
    if (!reply) return;

    this.isReplying.set(id);
    this.adminSupportService.replyToMessage(id, { message: reply }).subscribe({
      next: (res) => {
        if (res.is_success) {
          this.toastService.show('Reply Sent', 'Your response has been sent to the user.', 'success', 'check');
          this.fetchMessages();
          this.expandedMessageId.set(null); // Close on success
        }
        this.isReplying.set(null);
      },
      error: () => {
        this.isReplying.set(null);
      }
    });
  }

  updateReplyText(id: number, text: string) {
    const current = { ...this.replyText() };
    current[id] = text;
    this.replyText.set(current);
  }

  // Mobile Sorting Support
  sortOptions: DropdownOption[] = [
    { label: 'Default', value: '' },
    { label: 'Status', value: 'status:asc' },
    { label: 'Date (Newest)', value: 'created_at:desc' },
    { label: 'Date (Oldest)', value: 'created_at:asc' },
    { label: 'Subject (A-Z)', value: 'subject:asc' }
  ];

  selectedSortValue = computed(() => {
    const col = this.sortState.sortColumn();
    const dir = this.sortState.sortDirection();
    return col && dir ? `${String(col)}:${dir}` : '';
  });

  onMobileSortChange(value: string): void {
    if (!value) {
      this.sortState.sortColumn.set(null);
      this.sortState.sortDirection.set(null);
      return;
    }
    const [col, dir] = value.split(':');
    this.sortState.sortColumn.set(col as any);
    this.sortState.sortDirection.set(dir as 'asc' | 'desc');
  }
}
