import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminService } from '../../../core/services/admin.service';
import { AdminBugReport } from '../../../core/models/admin.model';
import { AppCacheService } from '../../../core/services/app-cache.service';
import { FormattingService } from '../../../core/services/formatting.service';
import { useTableSort } from '../../../core/utils/sort.util';
import { LoadingStateComponent } from '../../../shared/components/loading-state/loading-state.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { PageHeaderComponent } from '../../../shared/components/layout/page-header/page-header.component';
import { ToastService } from '../../../core/services/toast.service';
import { DropdownMenuComponent, DropdownOption } from '../../../shared/components/dropdown-menu/dropdown-menu.component';

interface CachedBugsData {
  bugs: AdminBugReport[];
  total: number;
  page: number;
}

const CACHE_KEY = 'emotra_admin_bugs';

@Component({
  selector: 'app-admin-bugs',
  standalone: true,
  imports: [CommonModule, LoadingStateComponent, EmptyStateComponent, PageHeaderComponent, DropdownMenuComponent],
  templateUrl: './admin-bugs.component.html',
  styleUrl: './admin-bugs.component.css'
})
export class AdminBugsComponent implements OnInit {
  private adminService = inject(AdminService);
  private toastService = inject(ToastService);
  private cache = inject(AppCacheService);
  protected format = inject(FormattingService);

  bugs = signal<AdminBugReport[]>([]);

  // Sorting
  sortState = useTableSort<AdminBugReport>(this.bugs);
  sortedBugs = this.sortState.sortedData;

  isLoading = signal<boolean>(true);
  error = signal<string | null>(null);

  // Pagination
  currentPage = signal<number>(1);
  pageSize = signal<number>(10);
  totalBugs = signal<number>(0);

  totalPages = computed(() => Math.ceil(this.totalBugs() / this.pageSize()) || 1);

  // Expanded row for detail view
  expandedId = signal<number | null>(null);

  // Status update tracking
  updatingId = signal<number | null>(null);
  deletingId = signal<number | null>(null);

  // Available statuses for the dropdown
  readonly statuses = ['Open', 'In Progress', 'Closed'];

  ngOnInit(): void {
    // 1. Check cache
    const cached = this.cache.getItem<CachedBugsData>(CACHE_KEY);

    if (cached) {
      const parsedBugs = cached.bugs.map(b => this.enrichBugData(b));
      this.bugs.set(parsedBugs);
      this.totalBugs.set(cached.total);
      this.currentPage.set(cached.page);
      this.isLoading.set(false);
    } else {
      // Only fetch if cache is empty
      this.fetchBugs();
    }
  }

  fetchBugs(): void {
    if (this.bugs().length === 0) {
      this.isLoading.set(true);
    }
    this.error.set(null);

    this.adminService.getBugReports(this.currentPage(), this.pageSize()).subscribe({
      next: (res) => {
        if (res.is_success && res.data) {
          const enrichedData = res.data.map(bug => this.enrichBugData(bug));
          this.bugs.set(enrichedData);
          this.totalBugs.set(res.total);
          this.cache.setItem<CachedBugsData>(CACHE_KEY, {
            bugs: enrichedData,
            total: res.total,
            page: this.currentPage()
          });
        } else {
          if (this.bugs().length === 0) {
            this.error.set(res.message || 'Failed to load bug reports.');
          }
        }
        this.isLoading.set(false);
      },
      error: () => {
        if (this.bugs().length === 0) {
          this.error.set('Could not connect to the server.');
        }
        this.isLoading.set(false);
      }
    });
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages()) return;
    this.currentPage.set(page);
    this.expandedId.set(null);
    this.fetchBugs();
  }

  // Mobile Sort Options
  sortOptions: DropdownOption[] = [
    { label: 'Default (None)', value: '' },
    { label: 'Newest First', value: 'created_at:desc' },
    { label: 'Oldest First', value: 'created_at:asc' },
    { label: 'Priority (High-Low)', value: 'priority:desc' },
    { label: 'Priority (Low-High)', value: 'priority:asc' },
    { label: 'Status', value: 'status:asc' }
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

  toggleExpand(bugId: number): void {
    this.expandedId.set(this.expandedId() === bugId ? null : bugId);
  }

  private enrichBugData(bug: AdminBugReport): AdminBugReport {
    if (!bug.metadata) return { ...bug, parsedMetadata: null };
    try {
      // Handle cases where metadata might be double stringified or just a string
      const parsed = typeof bug.metadata === 'string' ? JSON.parse(bug.metadata) : bug.metadata;
      return { ...bug, parsedMetadata: parsed };
    } catch (e) {
      console.warn('Failed to parse bug metadata', e);
      return { ...bug, parsedMetadata: null };
    }
  }

  updateStatus(bug: AdminBugReport, newStatus: string): void {
    if (bug.status === newStatus) return;

    this.updatingId.set(bug.id);

    this.adminService.updateBugStatus(bug.id, newStatus).subscribe({
      next: (res) => {
        if (res.is_success) {
          const updatedList = this.bugs().map(b =>
            b.id === bug.id ? { ...b, status: newStatus } : b
          );
          this.bugs.set(updatedList);

          this.cache.setItem<CachedBugsData>(CACHE_KEY, {
            bugs: updatedList,
            total: this.totalBugs(),
            page: this.currentPage()
          });

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

    this.adminService.deleteBugReport(bug.id).subscribe({
      next: (res) => {
        if (res.is_success) {
          const updatedList = this.bugs().filter(b => b.id !== bug.id);
          this.bugs.set(updatedList);
          this.totalBugs.update(t => t - 1);

          this.cache.setItem<CachedBugsData>(CACHE_KEY, {
            bugs: updatedList,
            total: this.totalBugs(),
            page: this.currentPage()
          });

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

  getPageNumbers(): number[] {
    const total = this.totalPages();
    const current = this.currentPage();
    const pages: number[] = [];
    const maxVisible = 5;

    let start = Math.max(1, current - Math.floor(maxVisible / 2));
    let end = Math.min(total, start + maxVisible - 1);
    start = Math.max(1, end - maxVisible + 1);

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  }
}
