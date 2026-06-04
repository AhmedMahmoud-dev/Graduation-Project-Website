import { Component, OnInit, inject, signal, computed, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { AdminService } from '../../../core/services/admin.service';
import { AdminBugReport } from '../../../core/models/admin.model';
import { AppCacheService } from '../../../core/services/app-cache.service';
import { FormattingService } from '../../../core/services/formatting.service';
import { LoadingStateComponent } from '../../../shared/components/loading-state/loading-state.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { PageHeaderComponent } from '../../../shared/components/layout/page-header/page-header.component';
import { ToastService } from '../../../core/services/toast.service';
import { DropdownMenuComponent, DropdownOption } from '../../../shared/components/dropdown-menu/dropdown-menu.component';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';

interface CachedBugsData {
  bugs: AdminBugReport[];
  total: number;
  page: number;
  status: string;
  priority: string;
  category: string;
}

const CACHE_KEY = 'emotra_admin_bugs_v2';

@Component({
  selector: 'app-admin-bugs',
  standalone: true,
  imports: [CommonModule, LoadingStateComponent, EmptyStateComponent, PageHeaderComponent, DropdownMenuComponent, PaginationComponent],
  templateUrl: './admin-bugs.component.html',
  styleUrl: './admin-bugs.component.css'
})
export class AdminBugsComponent implements OnInit {
  private adminService = inject(AdminService);
  private toastService = inject(ToastService);
  private cache = inject(AppCacheService);
  protected format = inject(FormattingService);
  private destroyRef = inject(DestroyRef);

  // State Signals
  bugs = signal<AdminBugReport[]>([]);
  statusFilter = signal<string>('all');
  priorityFilter = signal<string>('all');
  categoryFilter = signal<string>('all');
  
  // Sorting State
  sortColumn = signal<string | null>('created_at');
  sortDirection = signal<'asc' | 'desc'>('desc');

  // Pagination State
  currentPage = signal<number>(1);
  pageSize = signal<number>(10);
  totalBugs = signal<number>(0);

  totalPages = computed(() => Math.ceil(this.totalBugs() / this.pageSize()) || 1);

  isLoading = signal<boolean>(true);
  error = signal<string | null>(null);
  isRefreshing = signal<boolean>(false);

  // Expanded row for detail view
  expandedId = signal<number | null>(null);

  // Status update tracking
  updatingId = signal<number | null>(null);
  deletingId = signal<number | null>(null);

  // Available statuses for the dropdown
  readonly statuses = ['Open', 'In Progress', 'Closed'];

  statusOptions: DropdownOption[] = [
    { label: 'All Statuses', value: 'all' },
    { label: 'Open', value: 'Open' },
    { label: 'In Progress', value: 'In Progress' },
    { label: 'Closed', value: 'Closed' }
  ];

  priorityOptions: DropdownOption[] = [
    { label: 'All Priorities', value: 'all' },
    { label: 'Low', value: 'Low' },
    { label: 'Medium', value: 'Medium' },
    { label: 'High', value: 'High' }
  ];

  categoryOptions: DropdownOption[] = [
    { label: 'All Categories', value: 'all' },
    { label: 'UI/UX', value: 'UI/UX' },
    { label: 'Analysis Error', value: 'ANALYSIS ERROR' },
    { label: 'Login Issue', value: 'LOGIN ISSUE' },
    { label: 'Performance', value: 'PERFORMANCE' },
    { label: 'Data Issue', value: 'DATA ISSUE' },
    { label: 'Other', value: 'OTHER' }
  ];

  updateStatusFilter(status: string) {
    this.statusFilter.set(status);
    this.currentPage.set(1);
    this.fetchBugs();
  }

  updatePriorityFilter(priority: string) {
    this.priorityFilter.set(priority);
    this.currentPage.set(1);
    this.fetchBugs();
  }

  updateCategoryFilter(category: string) {
    this.categoryFilter.set(category);
    this.currentPage.set(1);
    this.fetchBugs();
  }

  onSortChange(column: string) {
    if (this.sortColumn() === column) {
      this.sortDirection.set(this.sortDirection() === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortColumn.set(column);
      this.sortDirection.set('desc');
    }
    this.fetchBugs();
  }

  ngOnInit(): void {
    const cached = this.cache.getItem<CachedBugsData>(CACHE_KEY);
    if (cached) {
      const parsedBugs = cached.bugs.map(b => this.enrichBugData(b));
      this.bugs.set(parsedBugs);
      this.totalBugs.set(cached.total);
      this.currentPage.set(cached.page);
      this.statusFilter.set(cached.status || 'all');
      this.priorityFilter.set(cached.priority || 'all');
      this.categoryFilter.set(cached.category || 'all');
      this.isLoading.set(false);
      this.fetchBugs(true);
    } else {
      this.fetchBugs(false);
    }
  }

  fetchBugs(isBackground: boolean = false): void {
    if (!isBackground) {
      if (this.bugs().length > 0 || !this.isLoading()) {
        this.isRefreshing.set(true);
      } else {
        this.isLoading.set(true);
      }
    }
    this.error.set(null);

    this.adminService.getBugReports(
      this.currentPage(),
      this.pageSize(),
      this.statusFilter(),
      this.priorityFilter(),
      this.categoryFilter(),
      this.sortColumn(),
      this.sortDirection()
    )
    .pipe(takeUntilDestroyed(this.destroyRef))
    .subscribe({
      next: (res) => {
        if (res.is_success && res.data) {
          const enrichedBugs = res.data.map(bug => this.enrichBugData(bug));
          this.bugs.set(enrichedBugs);
          this.totalBugs.set(res.total);
          
          this.cache.setItem<CachedBugsData>(CACHE_KEY, {
            bugs: enrichedBugs,
            total: res.total,
            page: this.currentPage(),
            status: this.statusFilter(),
            priority: this.priorityFilter(),
            category: this.categoryFilter()
          });
        } else {
          if (this.bugs().length === 0) {
            this.error.set(res.message || 'Failed to load bug reports.');
          }
        }
        this.isLoading.set(false);
        this.isRefreshing.set(false);
      },
      error: () => {
        if (this.bugs().length === 0) {
          this.error.set('Could not connect to the server.');
        }
        this.isLoading.set(false);
        this.isRefreshing.set(false);
      }
    });
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages()) return;
    this.currentPage.set(page);
    this.expandedId.set(null);
    this.fetchBugs();
  }

  sortOptions: DropdownOption[] = [
    { label: 'Newest First', value: 'created_at:desc' },
    { label: 'Oldest First', value: 'created_at:asc' },
    { label: 'Priority (High-Low)', value: 'priority:desc' },
    { label: 'Priority (Low-High)', value: 'priority:asc' },
    { label: 'Title (A-Z)', value: 'title:asc' },
    { label: 'Status', value: 'status:asc' }
  ];

  selectedSortValue = computed(() => {
    const col = this.sortColumn();
    const dir = this.sortDirection();
    return col && dir ? `${col}:${dir}` : 'created_at:desc';
  });

  onMobileSortChange(value: string): void {
    if (!value) return;
    const [col, dir] = value.split(':');
    this.sortColumn.set(col);
    this.sortDirection.set(dir as 'asc' | 'desc');
    this.fetchBugs();
  }

  toggleExpand(bugId: number): void {
    this.expandedId.set(this.expandedId() === bugId ? null : bugId);
  }

  private enrichBugData(bug: AdminBugReport): AdminBugReport {
    if (!bug.metadata) return { ...bug, parsedMetadata: null };
    try {
      const parsed = typeof bug.metadata === 'string' ? JSON.parse(bug.metadata) : bug.metadata;
      return { ...bug, parsedMetadata: parsed };
    } catch (e) {
      return { ...bug, parsedMetadata: null };
    }
  }

  updateStatus(bug: AdminBugReport, newStatus: string): void {
    if (bug.status === newStatus) return;

    this.updatingId.set(bug.id);

    this.adminService.updateBugStatus(bug.id, newStatus)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
      next: (res) => {
        if (res.is_success) {
          this.fetchBugs(true);
          this.toastService.show(`Bug #${bug.id} status updated to ${newStatus}.`, 'success');
        } else {
          this.toastService.show(res.message || 'Failed to update status.', 'error');
        }
        this.updatingId.set(null);
      },
      error: () => {
        this.toastService.show('Server error. Please try again.', 'error');
        this.updatingId.set(null);
      }
    });
  }

  deleteBug(bug: AdminBugReport): void {
    this.toastService.confirm(
      'Delete Bug Report',
      `Are you sure you want to permanently delete bug report #${bug.id}?`,
      () => this.executeDelete(bug),
      {
        confirmLabel: 'Delete',
        type: 'error',
        icon: 'trash'
      }
    );
  }

  private executeDelete(bug: AdminBugReport): void {
    this.deletingId.set(bug.id);

    this.adminService.deleteBugReport(bug.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
      next: (res) => {
        if (res.is_success) {
          this.fetchBugs(true);
          this.toastService.show(`Bug #${bug.id} deleted successfully.`, 'Success', 'success', 'check');
        } else {
          this.toastService.show('Deletion Failed', res.message || 'Failed to delete bug report.', 'error', 'error');
        }
        this.deletingId.set(null);
      },
      error: () => {
        this.toastService.show('Server Error', 'Could not complete deletion. Please try again.', 'error', 'error');
        this.deletingId.set(null);
      }
    });
  }

}
