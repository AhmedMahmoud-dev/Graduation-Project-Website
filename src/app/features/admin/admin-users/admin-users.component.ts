import { Component, OnInit, inject, signal, computed, effect, DestroyRef } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { AdminService } from '../../../core/services/admin.service';
import { AdminUser } from '../../../core/models/admin.model';
import { UserQuotaStatus, UpdateUserQuotaLimits } from '../../../core/models/quota.model';
import { AppCacheService } from '../../../core/services/app-cache.service';
import { FormattingService } from '../../../core/services/formatting.service';
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
  statusFilter: string;
  searchQuery: string;
}

const CACHE_KEY = 'emotra_admin_users_v2';

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

    // Handle Search Debouncing
    toObservable(this.searchQuery)
      .pipe(
        debounceTime(400),
        distinctUntilChanged(),
        takeUntilDestroyed()
      )
      .subscribe(() => {
        this.currentPage.set(1);
        this.fetchUsers();
      });
  }

  currentUser = this.authService.currentUser;

  // State Signals
  users = signal<AdminUser[]>([]);
  searchQuery = signal<string>('');
  statusFilter = signal<string>('all');
  
  // Sorting State
  sortColumn = signal<string | null>('created_at');
  sortDirection = signal<'asc' | 'desc'>('desc');

  // Pagination State
  currentPage = signal<number>(1);
  pageSize = signal<number>(10);
  totalUsers = signal<number>(0);

  totalPages = computed(() => Math.ceil(this.totalUsers() / this.pageSize()) || 1);

  isLoading = signal<boolean>(true);
  error = signal<string | null>(null);
  isUpdating = signal<boolean>(false);
  updatingUserId = signal<string | null>(null);
  isRefreshing = signal<boolean>(false);

  updateSearchQuery(q: string) {
    this.searchQuery.set(q);
  }

  updateStatusFilter(status: string) {
    this.statusFilter.set(status);
    this.currentPage.set(1);
    this.fetchUsers();
  }

  onSortChange(column: string) {
    if (this.sortColumn() === column) {
      this.sortDirection.set(this.sortDirection() === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortColumn.set(column);
      this.sortDirection.set('desc');
    }
    this.fetchUsers();
  }

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
  }

  onBanDurationChange(value: any) {
    this.banForm.get('duration')?.setValue(value);
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

    const finalDuration = Number(duration) === -1 ? null : (duration ? Number(duration) : null);

    this.isUpdating.set(true);
    this.updatingUserId.set(user.id);
    this.adminService.updateUserStatus(user.id, false, finalReason, finalDuration)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
      next: (res) => {
        if (res.is_success) {
          this.fetchUsers(true);
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
      this.statusFilter.set(cached.statusFilter);
      this.searchQuery.set(cached.searchQuery);
      this.isLoading.set(false);
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

    this.adminService.getUsers(
      this.currentPage(),
      this.pageSize(),
      this.searchQuery(),
      this.statusFilter(),
      this.sortColumn(),
      this.sortDirection()
    )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
      next: (res) => {
        if (res.is_success && res.data) {
          this.users.set(res.data);
          this.totalUsers.set(res.total);
          
          this.cache.setItem<CachedUsersData>(CACHE_KEY, {
            users: res.data,
            total: res.total,
            page: this.currentPage(),
            statusFilter: this.statusFilter(),
            searchQuery: this.searchQuery()
          });
        } else {
          if (this.users().length === 0) {
            this.error.set(res.message || 'Failed to load users.');
          }
        }
        this.isLoading.set(false);
        this.isRefreshing.set(false);
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
    this.fetchUsers();
  }

  sortOptions: DropdownOption[] = [
    { label: 'Newest First', value: 'created_at:desc' },
    { label: 'Oldest First', value: 'created_at:asc' },
    { label: 'Name (A-Z)', value: 'first_name:asc' },
    { label: 'Name (Z-A)', value: 'first_name:desc' },
    { label: 'Email (A-Z)', value: 'email:asc' },
    { label: 'Email (Z-A)', value: 'email:desc' },
    { label: 'Analyses (High-Low)', value: 'total_analyses:desc' },
    { label: 'Status', value: 'is_active:asc' }
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
    this.fetchUsers();
  }

  toggleUserStatus(user: AdminUser): void {
    if (this.isUpdating()) return;

    if (user.is_active) {
      this.openBanModal(user);
    } else {
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
                this.fetchUsers(true);
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
          this.fetchUsers(true);
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
