import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminService } from '../../../core/services/admin.service';
import { AdminTestimonial } from '../../../core/models/admin.model';
import { AppCacheService } from '../../../core/services/app-cache.service';
import { FormattingService } from '../../../core/services/formatting.service';
import { LoadingStateComponent } from '../../../shared/components/loading-state/loading-state.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { PageHeaderComponent } from '../../../shared/components/layout/page-header/page-header.component';
import { ToastService } from '../../../core/services/toast.service';

const CACHE_KEY = 'emotra_admin_testimonials';

@Component({
  selector: 'app-admin-testimonials',
  standalone: true,
  imports: [CommonModule, LoadingStateComponent, EmptyStateComponent, PageHeaderComponent],
  templateUrl: './admin-testimonials.component.html',
  styleUrl: './admin-testimonials.component.css'
})
export class AdminTestimonialsComponent implements OnInit {
  private adminService = inject(AdminService);
  private toastService = inject(ToastService);
  private cache = inject(AppCacheService);
  protected format = inject(FormattingService);

  testimonials = signal<AdminTestimonial[]>([]);
  isLoading = signal<boolean>(true);
  error = signal<string | null>(null);
  isRefreshing = signal<boolean>(false);

  // Track which card is currently being processed
  processingId = signal<number | null>(null);

  ngOnInit(): void {
    // 1. Check cache
    const cached = this.cache.getItem<AdminTestimonial[]>(CACHE_KEY);
    
    if (cached !== null) {
      this.testimonials.set(cached);
      this.isLoading.set(false);
      // Background sync
      this.fetchTestimonials(true);
    } else {
      this.fetchTestimonials(false);
    }
  }

  fetchTestimonials(isBackground: boolean = false): void {
    if (!isBackground) {
      // If we already have data OR it's not the initial load (isLoading is false), 
      // we prefer the refreshing spinner over the full-page loader
      if (this.testimonials().length > 0 || !this.isLoading()) {
        this.isRefreshing.set(true);
      } else {
        this.isLoading.set(true);
      }
    }
    this.error.set(null);

    this.adminService.getPendingTestimonials(1, 50).subscribe({
      next: (res) => {
        if (res.is_success && res.data) {
          this.testimonials.set(res.data);
          this.cache.setItem(CACHE_KEY, res.data);
        } else {
          if (this.testimonials().length === 0) {
            this.error.set(res.message || 'Failed to load testimonials.');
          }
        }
        this.isLoading.set(false);
        this.isRefreshing.set(false);
      },
      error: () => {
        if (this.testimonials().length === 0) {
          this.error.set('Could not connect to the server.');
        }
        this.isLoading.set(false);
        this.isRefreshing.set(false);
      }
    });
  }

  approve(testimonial: AdminTestimonial): void {
    this.processingId.set(testimonial.id);

    this.adminService.moderateTestimonial(testimonial.id, true).subscribe({
      next: (res) => {
        if (res.is_success) {
          const updated = this.testimonials().filter(t => t.id !== testimonial.id);
          this.testimonials.set(updated);
          this.cache.setItem(CACHE_KEY, updated);
          this.toastService.show(`Testimonial by ${testimonial.user_name || 'User'} approved.`, 'success');
        } else {
          this.toastService.show(res.message || 'Failed to approve.', 'error');
        }
        this.processingId.set(null);
      },
      error: () => {
        this.toastService.show('Server error. Please try again.', 'error');
        this.processingId.set(null);
      }
    });
  }

  reject(testimonial: AdminTestimonial): void {
    this.processingId.set(testimonial.id);

    this.adminService.moderateTestimonial(testimonial.id, false).subscribe({
      next: (res) => {
        if (res.is_success) {
          const updated = this.testimonials().filter(t => t.id !== testimonial.id);
          this.testimonials.set(updated);
          this.cache.setItem(CACHE_KEY, updated);
          this.toastService.show(`Testimonial by ${testimonial.user_name || 'User'} rejected.`, 'warning');
        } else {
          this.toastService.show(res.message || 'Failed to reject.', 'error');
        }
        this.processingId.set(null);
      },
      error: () => {
        this.toastService.show('Server error. Please try again.', 'error');
        this.processingId.set(null);
      }
    });
  }

  getStars(rating: number): number[] {
    return Array.from({ length: 5 }, (_, i) => i + 1);
  }

}
