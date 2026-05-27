import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AdminService } from '../../../core/services/admin.service';
import { GlobalQuota } from '../../../core/models/admin.model';
import { ToastService } from '../../../core/services/toast.service';
import { AppCacheService } from '../../../core/services/app-cache.service';
import { LoadingStateComponent } from '../../../shared/components/loading-state/loading-state.component';
import { PageHeaderComponent } from '../../../shared/components/layout/page-header/page-header.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';

const CACHE_KEY = 'emotra_admin_global_quota';

@Component({
  selector: 'app-admin-quota',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, LoadingStateComponent, PageHeaderComponent, EmptyStateComponent],
  templateUrl: './admin-quota.component.html',
  styleUrl: './admin-quota.component.css'
})
export class AdminQuotaComponent implements OnInit {
  private fb = inject(FormBuilder);
  private adminService = inject(AdminService);
  private toastService = inject(ToastService);
  private cache = inject(AppCacheService);

  quotaForm: FormGroup;
  isLoading = signal<boolean>(true);
  isSaving = signal<boolean>(false);
  isRefreshing = signal<boolean>(false);
  error = signal<string | null>(null);

  constructor() {
    this.quotaForm = this.fb.group({
      text_tokens_limit: [0, [Validators.required, Validators.min(1)]],
      audio_seconds_limit: [0, [Validators.required, Validators.min(1)]],
      video_seconds_limit: [0, [Validators.required, Validators.min(1)]],
      image_count_limit: [0, [Validators.required, Validators.min(1)]]
    });
  }

  ngOnInit(): void {
    // 1. Check cache for immediate display
    const cached = this.cache.getItem<GlobalQuota>(CACHE_KEY);

    if (cached) {
      this.quotaForm.patchValue(cached);
      this.isLoading.set(false);
      // Background sync to ensure data is fresh
      this.fetchGlobalQuota(true);
    } else {
      // Regular load if no cache
      this.fetchGlobalQuota(false);
    }
  }

  fetchGlobalQuota(isBackground: boolean = false): void {
    if (!isBackground) {
      if (this.quotaForm.pristine) {
         // If form is untouched, we can show loading/refreshing
         if (this.isLoading()) {
           this.isLoading.set(true);
         } else {
           this.isRefreshing.set(true);
         }
      }
    }
    this.error.set(null);

    this.adminService.getGlobalQuota().subscribe({
      next: (res) => {
        if (res.is_success && res.data) {
          // Only update if form hasn't been touched by user to avoid overwriting current edits
          if (this.quotaForm.pristine) {
            this.quotaForm.patchValue(res.data);
          }
          this.cache.setItem(CACHE_KEY, res.data);
        } else {
          // Only show error if we have no data at all
          if (!this.cache.getItem(CACHE_KEY)) {
            this.error.set(res.message || 'Failed to load global quota settings.');
          }
        }
        this.isLoading.set(false);
        this.isRefreshing.set(false);
      },
      error: (err) => {
        if (!this.cache.getItem(CACHE_KEY)) {
          this.error.set('Could not connect to the server.');
        }
        this.isLoading.set(false);
        this.isRefreshing.set(false);
      }
    });
  }

  onSubmit(): void {
    if (this.quotaForm.invalid) {
      this.quotaForm.markAllAsTouched();
      return;
    }

    this.toastService.confirm(
      'Update Global Limits?',
      'Updating global limits will reset all custom user overrides to these new values. This action cannot be undone.',
      () => this.saveQuota(),
      {
        confirmLabel: 'Update All Users',
        type: 'warning',
        icon: 'refresh'
      }
    );
  }

  private saveQuota(): void {
    this.isSaving.set(true);
    const limits: GlobalQuota = this.quotaForm.value;

    this.adminService.updateGlobalQuota(limits).subscribe({
      next: (res) => {
        if (res.is_success) {
          this.toastService.show(
            'Success',
            'Global quota limits updated and all user overrides cleared.',
            'success',
            'check'
          );
          // Update cache with new values
          this.cache.setItem(CACHE_KEY, limits);
          this.quotaForm.markAsPristine();
        } else {
          this.toastService.show(
            'Error',
            res.message || 'Failed to update global quota limits.',
            'error',
            'error'
          );
        }
        this.isSaving.set(false);
      },
      error: () => {
        this.toastService.show(
          'Error',
          'A communication error occurred with the server.',
          'error',
          'error'
        );
        this.isSaving.set(false);
      }
    });
  }

  resetForm(): void {
    this.fetchGlobalQuota();
  }
}
