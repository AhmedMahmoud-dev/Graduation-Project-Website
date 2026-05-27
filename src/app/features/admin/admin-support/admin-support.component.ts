import { Component, inject, signal, OnInit, computed, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
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
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';

const CACHE_KEY = 'emotra_admin_support';

@Component({
  selector: 'app-admin-support',
  standalone: true,
  imports: [CommonModule, FormsModule, LoadingStateComponent, EmptyStateComponent, PageHeaderComponent, DropdownMenuComponent, PaginationComponent],
  templateUrl: './admin-support.component.html',
  styleUrls: ['./admin-support.component.css']
})
export class AdminSupportComponent implements OnInit {
  private adminSupportService = inject(AdminSupportService);
  private toastService = inject(ToastService);
  protected format = inject(FormattingService);
  private cache = inject(AppCacheService);
  private destroyRef = inject(DestroyRef);

  messages = signal<AdminSupportMessage[]>([]);

  // Sorting
  sortState = useTableSort<AdminSupportMessage>(this.messages);
  sortedMessages = this.sortState.sortedData;

  // Pagination
  currentPage = signal<number>(1);
  pageSize = signal<number>(10);
  totalPages = computed(() => Math.ceil(this.messages().length / this.pageSize()) || 1);

  // Pagination-based Slicing
  paginatedMessages = computed(() => {
    const list = this.sortedMessages();
    const page = this.currentPage();
    const size = this.pageSize();
    
    const startIndex = (page - 1) * size;
    return list.slice(startIndex, startIndex + size);
  });

  totalMessages = signal<number>(0);
  pendingMessagesCount = computed(() => this.messages().filter(m => m.status === 'open' || m.status === 'pending').length);
  isLoading = signal(true);
  error = signal<string | null>(null);
  isRefreshing = signal<boolean>(false);

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
      // Background sync
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
    this.adminSupportService.getMessages(1, 1000)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
      next: (res) => {
        if (res.is_success && res.data) {
          const data = res.data;
          let firstPageItems: AdminSupportMessage[] = [];
          let total = 0;

          if (Array.isArray(data)) {
            firstPageItems = data;
            total = data.length;
          } else if (data.items) {
            firstPageItems = data.items;
            total = data.total_count ?? data.items.length;
          }

          if (firstPageItems.length < total && firstPageItems.length > 0) {
            const serverPageSize = firstPageItems.length;
            const totalPagesNeeded = Math.ceil(total / serverPageSize);
            const requests = [];

            for (let p = 2; p <= totalPagesNeeded; p++) {
              requests.push(this.adminSupportService.getMessages(p, serverPageSize));
            }

            forkJoin(requests)
              .pipe(takeUntilDestroyed(this.destroyRef))
              .subscribe({
              next: (responses) => {
                let allItems = [...firstPageItems];
                for (const r of responses) {
                  if (r.is_success && r.data) {
                    const rData = r.data;
                    if (Array.isArray(rData)) {
                      allItems = [...allItems, ...rData];
                    } else if (rData.items) {
                      allItems = [...allItems, ...rData.items];
                    }
                  }
                }

                this.messages.set(allItems);
                this.totalMessages.set(allItems.length);
                this.cache.setItem(CACHE_KEY, allItems);
                this.isLoading.set(false);
                this.isRefreshing.set(false);
              },
              error: () => {
                this.messages.set(firstPageItems);
                this.totalMessages.set(firstPageItems.length);
                this.isLoading.set(false);
                this.isRefreshing.set(false);
              }
            });
          } else {
            this.messages.set(firstPageItems);
            this.totalMessages.set(total);
            this.cache.setItem(CACHE_KEY, firstPageItems);
            this.isLoading.set(false);
            this.isRefreshing.set(false);
          }
        } else {
          if (this.messages().length === 0) {
            this.error.set('Failed to load support queue');
          }
          this.isLoading.set(false);
          this.isRefreshing.set(false);
        }
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
    this.adminSupportService.replyToMessage(id, { message: reply })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
      next: (res) => {
        if (res.is_success) {
          this.toastService.show('Reply Sent', 'Your response has been sent to the user.', 'success', 'check');
          
          // Update local state instantly
          const updatedList = this.messages().map(m => 
            m.id === id ? ({ ...m, status: 'replied', replied_at: new Date().toISOString() } as AdminSupportMessage) : m
          );
          this.messages.set(updatedList);
          this.cache.setItem(CACHE_KEY, updatedList);
          
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
