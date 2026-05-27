import { Component, inject, signal, OnInit, computed, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../../core/services/admin.service';
import { ToastService } from '../../../core/services/toast.service';
import { FormattingService } from '../../../core/services/formatting.service';
import { AdminSupportMessage } from '../../../core/models/support.model';
import { LoadingStateComponent } from '../../../shared/components/loading-state/loading-state.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { PageHeaderComponent } from '../../../shared/components/layout/page-header/page-header.component';
import { AppCacheService } from '../../../core/services/app-cache.service';
import { DropdownMenuComponent, DropdownOption } from '../../../shared/components/dropdown-menu/dropdown-menu.component';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';

interface CachedSupportData {
  messages: AdminSupportMessage[];
  total: number;
  page: number;
  status: string;
}

const CACHE_KEY = 'emotra_admin_support_v2';

@Component({
  selector: 'app-admin-support',
  standalone: true,
  imports: [CommonModule, FormsModule, LoadingStateComponent, EmptyStateComponent, PageHeaderComponent, DropdownMenuComponent, PaginationComponent],
  templateUrl: './admin-support.component.html',
  styleUrls: ['./admin-support.component.css']
})
export class AdminSupportComponent implements OnInit {
  private adminService = inject(AdminService);
  private toastService = inject(ToastService);
  protected format = inject(FormattingService);
  private cache = inject(AppCacheService);
  private destroyRef = inject(DestroyRef);

  // State Signals
  messages = signal<AdminSupportMessage[]>([]);
  statusFilter = signal<string>('all');
  
  // Sorting State
  sortColumn = signal<string | null>('created_at');
  sortDirection = signal<'asc' | 'desc'>('desc');

  // Pagination State
  currentPage = signal<number>(1);
  pageSize = signal<number>(10);
  totalMessages = signal<number>(0);

  totalPages = computed(() => Math.ceil(this.totalMessages() / this.pageSize()) || 1);
  pendingMessagesCount = computed(() => this.messages().filter(m => m.status === 'open' || m.status === 'pending').length);

  isLoading = signal(true);
  error = signal<string | null>(null);
  isRefreshing = signal<boolean>(false);

  // Interaction State
  expandedMessageId = signal<number | null>(null);
  isReplying = signal<number | null>(null);
  replyText = signal<Record<number, string>>({});

  statusOptions: DropdownOption[] = [
    { label: 'All Statuses', value: 'all' },
    { label: 'Pending', value: 'open' },
    { label: 'Replied', value: 'replied' }
  ];

  updateStatusFilter(status: string) {
    this.statusFilter.set(status);
    this.currentPage.set(1);
    this.fetchMessages();
  }

  onSortChange(column: string) {
    if (this.sortColumn() === column) {
      this.sortDirection.set(this.sortDirection() === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortColumn.set(column);
      this.sortDirection.set('desc');
    }
    this.fetchMessages();
  }

  ngOnInit() {
    const cached = this.cache.getItem<CachedSupportData>(CACHE_KEY);
    if (cached) {
      this.messages.set(cached.messages);
      this.totalMessages.set(cached.total);
      this.currentPage.set(cached.page);
      this.statusFilter.set(cached.status || 'all');
      this.isLoading.set(false);
      this.fetchMessages(true);
    } else {
      this.fetchMessages(false);
    }
  }

  fetchMessages(isBackground: boolean = false) {
    if (!isBackground) {
      if (this.messages().length === 0) {
        this.isLoading.set(true);
      } else {
        this.isRefreshing.set(true);
      }
    }
    this.error.set(null);

    this.adminService.getSupportMessages(
      this.currentPage(),
      this.pageSize(),
      this.statusFilter(),
      this.sortColumn(),
      this.sortDirection()
    )
    .pipe(takeUntilDestroyed(this.destroyRef))
    .subscribe({
      next: (res) => {
        if (res.is_success && res.data) {
          const items = Array.isArray(res.data) ? res.data : (res.data.items || []);
          const total = Array.isArray(res.data) ? res.data.length : (res.data.total_count ?? items.length);
          
          this.messages.set(items);
          this.totalMessages.set(total);
          
          this.cache.setItem<CachedSupportData>(CACHE_KEY, {
            messages: items,
            total: total,
            page: this.currentPage(),
            status: this.statusFilter()
          });
        } else {
          if (this.messages().length === 0) {
            this.error.set('Failed to load support queue');
          }
        }
        this.isLoading.set(false);
        this.isRefreshing.set(false);
      },
      error: (err) => {
        if (this.messages().length === 0) {
          this.error.set(err.message || 'Failed to load support queue');
        }
        this.isLoading.set(false);
        this.isRefreshing.set(false);
      }
    });
  }

  goToPage(page: number) {
    if (page < 1 || page > this.totalPages()) return;
    this.currentPage.set(page);
    this.expandedMessageId.set(null);
    this.fetchMessages();
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
    this.adminService.replyToSupportMessage(id, { message: reply })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
      next: (res) => {
        if (res.is_success) {
          this.toastService.show('Reply Sent', 'Your response has been sent to the user.', 'success', 'check');
          this.fetchMessages(true);
          this.expandedMessageId.set(null);
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
    { label: 'Newest First', value: 'created_at:desc' },
    { label: 'Oldest First', value: 'created_at:asc' },
    { label: 'Subject (A-Z)', value: 'subject:asc' },
    { label: 'Status', value: 'status:asc' }
  ];

  selectedSortValue = computed(() => {
    const col = this.sortColumn();
    const dir = this.sortDirection();
    return col && dir ? `${String(col)}:${dir}` : 'created_at:desc';
  });

  onMobileSortChange(value: string): void {
    if (!value) return;
    const [col, dir] = value.split(':');
    this.sortColumn.set(col);
    this.sortDirection.set(dir as 'asc' | 'desc');
    this.fetchMessages();
  }
}
