import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { AdminService } from '../../../core/services/admin.service';
import { AdminUser } from '../../../core/models/admin.model';
import { AppCacheService } from '../../../core/services/app-cache.service';
import { FormattingService } from '../../../core/services/formatting.service';
import { useTableSort } from '../../../core/utils/sort.util';
import { LoadingStateComponent } from '../../../shared/components/loading-state/loading-state.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { PageHeaderComponent } from '../../../shared/components/layout/page-header/page-header.component';
import { ToastService } from '../../../core/services/toast.service';
import { DropdownMenuComponent, DropdownOption } from '../../../shared/components/dropdown-menu/dropdown-menu.component';
import { AuthService } from '../../../core/services/auth.service';

interface CachedUsersData {
  users: AdminUser[];
  total: number;
  page: number;
}

const CACHE_KEY = 'emotra_admin_users';

@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [CommonModule, LoadingStateComponent, EmptyStateComponent, PageHeaderComponent, DropdownMenuComponent, ReactiveFormsModule],
  templateUrl: './admin-users.component.html',
  styleUrl: './admin-users.component.css'
})
export class AdminUsersComponent implements OnInit {
  private adminService = inject(AdminService);
  private toastService = inject(ToastService);
  private cache = inject(AppCacheService);
  private authService = inject(AuthService);
  private fb = inject(FormBuilder);
  protected format = inject(FormattingService);

  currentUser = this.authService.currentUser;

  users = signal<AdminUser[]>([]);

  // Sorting
  sortState = useTableSort<AdminUser>(this.users);
  sortedUsers = this.sortState.sortedData;

  isLoading = signal<boolean>(true);
  error = signal<string | null>(null);

  // Pagination
  currentPage = signal<number>(1);
  pageSize = signal<number>(10);
  totalUsers = signal<number>(0);

  totalPages = computed(() => Math.ceil(this.totalUsers() / this.pageSize()) || 1);

  isUpdating = signal<boolean>(false);
  updatingUserId = signal<string | null>(null);

  // Ban Modal
  isBanModalOpen = signal<boolean>(false);
  selectedUserForBan = signal<AdminUser | null>(null);
  banForm = this.fb.group({
    reason: ['', Validators.required],
    otherReason: [''],
    duration: ['', Validators.required]
  });

  banReasons: DropdownOption[] = [
    { label: 'Abusive behavior', value: 'Abusive behavior' },
    { label: 'Spam or misuse', value: 'Spam or misuse' },
    { label: 'Violation of terms', value: 'Violation of terms' },
    { label: 'Suspicious activity', value: 'Suspicious activity' },
    { label: 'Other', value: 'Other' }
  ];

  banDurations: DropdownOption[] = [
    { label: "1 Hour", value: 1 },
    { label: "6 Hours", value: 6 },
    { label: "24 Hours", value: 24 },
    { label: "3 Days", value: 72 },
    { label: "7 Days", value: 168 },
    { label: "30 Days", value: 720 },
    { label: "Permanent", value: null }
  ];

  onBanReasonChange(value: any) {
    this.banForm.patchValue({ reason: value });
  }

  onBanDurationChange(value: any) {
    this.banForm.patchValue({ duration: value });
  }

  openBanModal(user: AdminUser) {
    this.selectedUserForBan.set(user);
    this.banForm.reset({ reason: '', otherReason: '', duration: '' });
    this.isBanModalOpen.set(true);
  }

  closeBanModal() {
    this.isBanModalOpen.set(false);
    this.selectedUserForBan.set(null);
  }

  confirmBan() {
    if (this.banForm.invalid) {
      this.banForm.markAllAsTouched();
      return;
    }

    const user = this.selectedUserForBan();
    if (!user) return;

    const { reason, otherReason, duration } = this.banForm.getRawValue();
    const finalReason = reason === 'Other' ? otherReason : reason;

    if (reason === 'Other' && !otherReason) {
      this.toastService.show('Validation Error', 'Please specify the reason.', 'error');
      return;
    }

    this.isUpdating.set(true);
    this.updatingUserId.set(user.id);
    this.adminService.updateUserStatus(user.id, false, finalReason, duration !== undefined && duration !== null ? Number(duration) : null).subscribe({
      next: (res) => {
        if (res.is_success) {
          const updatedList = this.users().map(u =>
            u.id === user.id ? { ...u, is_active: false } : u
          );
          this.users.set(updatedList);
          
          this.cache.setItem<CachedUsersData>(CACHE_KEY, {
            users: updatedList,
            total: this.totalUsers(),
            page: this.currentPage()
          });

          this.closeBanModal();
          this.toastService.show('User Banned', `${user.first_name} has been suspended.`, 'warning');
        } else {
          this.toastService.show('Error', res.message || 'Failed to ban user.', 'error');
        }
        this.isUpdating.set(false);
        this.updatingUserId.set(null);
      },
      error: () => {
        this.toastService.show('Error', 'Server error. Please try again.', 'error');
        this.isUpdating.set(false);
        this.updatingUserId.set(null);
      }
    });
  }

  ngOnInit(): void {
    const cached = this.cache.getItem<CachedUsersData>(CACHE_KEY);
    if (cached) {
      this.users.set(cached.users);
      this.totalUsers.set(cached.total);
      this.currentPage.set(cached.page);
      this.isLoading.set(false);
    } else {
      this.fetchUsers();
    }
  }

  fetchUsers(): void {
    if (this.users().length === 0) {
      this.isLoading.set(true);
    }
    this.error.set(null);

    this.adminService.getUsers(this.currentPage(), this.pageSize()).subscribe({
      next: (res) => {
        if (res.is_success && res.data) {
          this.users.set(res.data);
          this.totalUsers.set(res.total);
          this.cache.setItem<CachedUsersData>(CACHE_KEY, {
            users: res.data,
            total: res.total,
            page: this.currentPage()
          });
        } else {
          if (this.users().length === 0) {
            this.error.set(res.message || 'Failed to load users.');
          }
        }
        this.isLoading.set(false);
      },
      error: () => {
        if (this.users().length === 0) {
          this.error.set('Could not connect to the server.');
        }
        this.isLoading.set(false);
      }
    });
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages()) return;
    this.currentPage.set(page);
    this.fetchUsers();
  }

  sortOptions: DropdownOption[] = [
    { label: 'Default (None)', value: '' },
    { label: 'Name (A-Z)', value: 'first_name:asc' },
    { label: 'Name (Z-A)', value: 'first_name:desc' },
    { label: 'Newest First', value: 'created_at:desc' },
    { label: 'Oldest First', value: 'created_at:asc' },
    { label: 'Analyses (High-Low)', value: 'total_analyses:desc' }
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

  toggleUserStatus(user: AdminUser): void {
    if (this.isUpdating()) return;

    if (user.is_active) {
      // If active, we want to BAN -> open modal
      this.openBanModal(user);
    } else {
      // If already banned, we want to ACTIVATE -> simple toggle
      this.toastService.confirm(
        'Activate User?',
        `Are you sure you want to reactivate ${user.first_name}'s account?`,
        () => {
          this.isUpdating.set(true);
          this.updatingUserId.set(user.id);

          this.adminService.updateUserStatus(user.id, true).subscribe({
            next: (res) => {
              if (res.is_success) {
                const updatedList = this.users().map(u =>
                  u.id === user.id ? { ...u, is_active: true } : u
                );
                this.users.set(updatedList);

                this.cache.setItem<CachedUsersData>(CACHE_KEY, {
                  users: updatedList,
                  total: this.totalUsers(),
                  page: this.currentPage()
                });

                this.toastService.show('Status Updated', `${user.first_name} has been activated.`, 'success');
              } else {
                this.toastService.show('Error', res.message || 'Failed to update status.', 'error');
              }
              this.isUpdating.set(false);
              this.updatingUserId.set(null);
            },
            error: () => {
              this.toastService.show('Error', 'Server error. Please try again.', 'error');
              this.isUpdating.set(false);
              this.updatingUserId.set(null);
            }
          });
        },
        { confirmLabel: 'Activate', type: 'success', icon: 'check' }
      );
    }
  }

  deleteUser(user: AdminUser): void {
    if (user.id === this.currentUser()?.user_id) {
      this.toastService.show('Action Denied', 'You cannot delete your own account.', 'error', 'error');
      return;
    }

    this.toastService.confirm(
      'Permanent User Deletion',
      `Enter your admin password to permanently purge ${user.first_name}'s account and all associated data. This action is IRREVERSIBLE.`,
      (password?: string) => {
        if (!password) return;
        this.executeNuclearDelete(user, password);
      },
      {
        confirmLabel: 'Nuclear Delete',
        type: 'error',
        icon: 'trash',
        requireInput: true,
        inputType: 'password'
      }
    );
  }

  private executeNuclearDelete(user: AdminUser, password: string): void {
    this.isUpdating.set(true);
    this.updatingUserId.set(user.id);

    this.adminService.deleteUser(user.id, password).subscribe({
      next: (res) => {
        if (res.is_success) {
          const updatedList = this.users().filter(u => u.id !== user.id);
          this.users.set(updatedList);
          this.totalUsers.update(t => t - 1);
          
          this.cache.setItem<CachedUsersData>(CACHE_KEY, {
            users: updatedList,
            total: this.totalUsers(),
            page: this.currentPage()
          });

          this.toastService.show('User Purged', `${user.first_name}'s account has been permanently removed.`, 'success', 'check');
        } else {
          this.toastService.show('Purge Failed', res.message || 'Incorrect password or server error.', 'error', 'error');
        }
        this.isUpdating.set(false);
        this.updatingUserId.set(null);
      },
      error: (err) => {
        this.toastService.show('Verification Failed', err.error?.message || 'Incorrect password or server error.', 'error', 'error');
        this.isUpdating.set(false);
        this.updatingUserId.set(null);
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
