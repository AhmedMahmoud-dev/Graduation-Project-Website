import { Component, OnInit, inject, signal, computed, effect, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { forkJoin } from 'rxjs';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { AdminService } from '../../../core/services/admin.service';
import { AdminUser } from '../../../core/models/admin.model';
import { UserQuotaStatus, UpdateUserQuotaLimits } from '../../../core/models/quota.model';
import { AppCacheService } from '../../../core/services/app-cache.service';
import { FormattingService } from '../../../core/services/formatting.service';
import { useTableSort } from '../../../core/utils/sort.util';
import { LoadingStateComponent } from '../../../shared/components/loading-state/loading-state.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { PageHeaderComponent } from '../../../shared/components/layout/page-header/page-header.component';
import { ToastService } from '../../../core/services/toast.service';
import { DropdownMenuComponent, DropdownOption } from '../../../shared/components/dropdown-menu/dropdown-menu.component';
import { AuthService } from '../../../core/services/auth.service';
import { SearchInputComponent } from '../../../shared/components/search-input/search-input.component';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';


interface CachedUsersData {
  users: AdminUser[];
  total: number;
  page: number;
}

const CACHE_KEY = 'emotra_admin_users';

@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [CommonModule, LoadingStateComponent, EmptyStateComponent, PageHeaderComponent, DropdownMenuComponent, ReactiveFormsModule, SearchInputComponent, PaginationComponent],
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
  private destroyRef = inject(DestroyRef);

  constructor() {
    effect(() => {
      if (this.isBanModalOpen() || this.isQuotaModalOpen()) {
        document.body.classList.add('no-scroll');
      } else {
        document.body.classList.remove('no-scroll');
      }
    });
  }

  currentUser = this.authService.currentUser;

  users = signal<AdminUser[]>([]);
  searchQuery = signal<string>('');
  statusFilter = signal<string>('all');

  updateSearchQuery(q: string) {
    this.searchQuery.set(q);
    this.currentPage.set(1);
  }

  updateStatusFilter(status: string) {
    this.statusFilter.set(status);
    this.currentPage.set(1);
  }

  filteredUsers = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    const status = this.statusFilter();
    let list = this.users();

    // 1. Status Filter
    if (status !== 'all') {
      list = list.filter(user => {
        if (status === 'online') return this.isUserOnline(user);
        if (status === 'offline') return !this.isUserOnline(user) && user.is_active;
        if (status === 'banned') return !user.is_active;
        return true;
      });
    }

    // 2. Search Query
    if (!q) return list;

    return list.filter(user =>
      `${user.first_name} ${user.last_name}`.toLowerCase().includes(q) ||
      user.email.toLowerCase().includes(q) ||
      user.id.toLowerCase().includes(q)
    );
  });

  // Sorting
  sortState = useTableSort<AdminUser>(this.filteredUsers);
  sortedUsers = this.sortState.sortedData;

  // Pagination-based Slicing
  paginatedUsers = computed(() => {
    const list = this.sortedUsers();
    const page = this.currentPage();
    const size = this.pageSize();
    
    const startIndex = (page - 1) * size;
    return list.slice(startIndex, startIndex + size);
  });

  isLoading = signal<boolean>(true);
  error = signal<string | null>(null);

  // Pagination
  currentPage = signal<number>(1);
  pageSize = signal<number>(10);
  totalUsers = signal<number>(0);

  totalPages = computed(() => Math.ceil(this.filteredUsers().length / this.pageSize()) || 1);

  isUpdating = signal<boolean>(false);
  updatingUserId = signal<string | null>(null);
  isRefreshing = signal<boolean>(false);

  // Quota Modal
  isQuotaModalOpen = signal<boolean>(false);
  selectedUserForQuota = signal<AdminUser | null>(null);
  userQuotaDetails = signal<UserQuotaStatus | null>(null);
  isLoadingQuota = signal<boolean>(false);
  
  quotaForm = this.fb.group({
    textTokensLimit: [0, [Validators.required, Validators.min(0)]],
    audioSecondsLimit: [0, [Validators.required, Validators.min(0)]],
    videoSecondsLimit: [0, [Validators.required, Validators.min(0)]],
    imageCountLimit: [0, [Validators.required, Validators.min(0)]]
  });

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
    { label: "Permanent", value: -1 }
  ];

  statusOptions: DropdownOption[] = [
    { label: 'All Status', value: 'all' },
    { label: 'Online', value: 'online' },
    { label: 'Offline', value: 'offline' },
    { label: 'Banned', value: 'banned' }
  ];

  onBanReasonChange(value: any) {
    this.banForm.get('reason')?.setValue(value);
    this.banForm.get('reason')?.markAsTouched();
    this.banForm.get('reason')?.updateValueAndValidity();
  }

  onBanDurationChange(value: any) {
    this.banForm.get('duration')?.setValue(value);
    this.banForm.get('duration')?.markAsTouched();
    this.banForm.get('duration')?.updateValueAndValidity();
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

    // Map -1 back to null for the API (Permanent ban), or parse number
    const finalDuration = Number(duration) === -1 ? null : (duration ? Number(duration) : null);

    this.isUpdating.set(true);
    this.updatingUserId.set(user.id);
    this.adminService.updateUserStatus(user.id, false, finalReason, finalDuration)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
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
      // Fetch in background
      this.fetchUsers(true);
    } else {
      this.fetchUsers(false);
    }
  }

  fetchUsers(isBackground: boolean = false): void {
    if (!isBackground) {
      if (this.users().length === 0) {
        this.isLoading.set(true);
      } else {
        this.isRefreshing.set(true);
      }
    }
    this.error.set(null);

    // Fetch page 1 with a large size (e.g. 1000) to get all users in a single request if possible
    this.adminService.getUsers(1, 1000)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
      next: (res) => {
        if (res.is_success && res.data) {
          const firstPageUsers = res.data;
          const total = res.total;

          // If the backend didn't return all users (because of server-side page size limit),
          // we fetch the remaining pages.
          if (firstPageUsers.length < total && firstPageUsers.length > 0) {
            const serverPageSize = firstPageUsers.length;
            const totalPagesNeeded = Math.ceil(total / serverPageSize);
            const requests = [];

            for (let p = 2; p <= totalPagesNeeded; p++) {
              requests.push(this.adminService.getUsers(p, serverPageSize));
            }

            forkJoin(requests)
              .pipe(takeUntilDestroyed(this.destroyRef))
              .subscribe({
              next: (responses) => {
                let allUsers = [...firstPageUsers];
                for (const r of responses) {
                  if (r.is_success && r.data) {
                    allUsers = [...allUsers, ...r.data];
                  }
                }

                this.users.set(allUsers);
                this.totalUsers.set(allUsers.length);
                this.cache.setItem<CachedUsersData>(CACHE_KEY, {
                  users: allUsers,
                  total: allUsers.length,
                  page: this.currentPage()
                });
                this.isLoading.set(false);
                this.isRefreshing.set(false);
              },
              error: () => {
                // Fallback to whatever we got on page 1 if additional pages fail
                this.users.set(firstPageUsers);
                this.totalUsers.set(firstPageUsers.length);
                this.isLoading.set(false);
                this.isRefreshing.set(false);
              }
            });
          } else {
            // Otherwise we fetched all users in one go
            this.users.set(firstPageUsers);
            this.totalUsers.set(total);
            this.cache.setItem<CachedUsersData>(CACHE_KEY, {
              users: firstPageUsers,
              total: total,
              page: this.currentPage()
            });
            this.isLoading.set(false);
            this.isRefreshing.set(false);
          }
        } else {
          if (this.users().length === 0) {
            this.error.set(res.message || 'Failed to load users.');
          }
          this.isLoading.set(false);
          this.isRefreshing.set(false);
        }
      },
      error: () => {
        if (this.users().length === 0) {
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
  }

  sortOptions: DropdownOption[] = [
    { label: 'Default (None)', value: '' },
    { label: 'Name (A-Z)', value: 'first_name:asc' },
    { label: 'Name (Z-A)', value: 'first_name:desc' },
    { label: 'Newest First', value: 'created_at:desc' },
    { label: 'Oldest First', value: 'created_at:asc' },
    { label: 'Analyses (High-Low)', value: 'total_analyses:desc' },
    { label: 'Status', value: 'is_active:asc' }
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

          this.adminService.updateUserStatus(user.id, true)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
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

    this.adminService.deleteUser(user.id, password)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
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



  isUserOnline(user: AdminUser): boolean {
    // A user is online if their account is active AND the server reports them as online
    return user.is_active && user.is_online;
  }

  openQuotaModal(user: AdminUser) {
    this.selectedUserForQuota.set(user);
    this.userQuotaDetails.set(null);
    this.isLoadingQuota.set(true);
    this.isQuotaModalOpen.set(true);
    
    this.adminService.getUserQuota(user.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          if (res.is_success && res.data) {
            this.userQuotaDetails.set(res.data);
            this.quotaForm.setValue({
              textTokensLimit: res.data.text.limit,
              audioSecondsLimit: res.data.audio.limit,
              videoSecondsLimit: res.data.video.limit,
              imageCountLimit: res.data.image.limit
            });
          } else {
            this.toastService.show('Error', res.message || 'Failed to load user quota details.', 'error');
            this.closeQuotaModal();
          }
          this.isLoadingQuota.set(false);
        },
        error: () => {
          this.toastService.show('Error', 'Failed to connect to the server.', 'error');
          this.closeQuotaModal();
          this.isLoadingQuota.set(false);
        }
      });
  }

  closeQuotaModal() {
    this.isQuotaModalOpen.set(false);
    this.selectedUserForQuota.set(null);
    this.userQuotaDetails.set(null);
  }

  saveQuotaLimits() {
    if (this.quotaForm.invalid) {
      this.quotaForm.markAllAsTouched();
      return;
    }

    const user = this.selectedUserForQuota();
    if (!user) return;

    const raw = this.quotaForm.getRawValue();
    const payload: UpdateUserQuotaLimits = {
      text_tokens_limit: Number(raw.textTokensLimit),
      audio_seconds_limit: Number(raw.audioSecondsLimit),
      video_seconds_limit: Number(raw.videoSecondsLimit),
      image_count_limit: Number(raw.imageCountLimit)
    };

    this.isUpdating.set(true);
    this.adminService.updateUserQuota(user.id, payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          if (res.is_success) {
            this.toastService.show('Quota Updated', 'User weekly quota limits updated successfully.', 'success');
            this.closeQuotaModal();
          } else {
            this.toastService.show('Error', res.message || 'Failed to update quota limits.', 'error');
          }
          this.isUpdating.set(false);
        },
        error: () => {
          this.toastService.show('Error', 'Server error. Failed to update quota limits.', 'error');
          this.isUpdating.set(false);
        }
      });
  }
}
