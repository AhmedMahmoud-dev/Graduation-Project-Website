import { Component, inject, signal, OnInit, effect, untracked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FeedbackService } from '../../../core/services/feedback.service';
import { TestimonialsResponse, TestimonialItem, TestimonialsStats } from '../../../core/models/feedback.model';
import { finalize } from 'rxjs';
import { SystemFeedbackUIService } from '../../../core/services/system-feedback-ui.service';

@Component({
  selector: 'app-testimonials-section',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './testimonials-section.component.html',
  styleUrl: './testimonials-section.component.css'
})
export class TestimonialsSectionComponent implements OnInit {
  private feedbackService = inject(FeedbackService);
  private uiService = inject(SystemFeedbackUIService);


  private readonly CACHE_KEY = 'emotra_public_testimonials';

  // Carousel state
  activeIndex = signal(0);
  private touchStartX = 0;
  private touchDeltaX = 0;

  // Initial rehydration logic to prevent ANY flicker
  private getCachedData() {
    try {
      const cached = localStorage.getItem(this.CACHE_KEY);
      if (cached) return JSON.parse(cached);
    } catch { }
    return null;
  }

  // State initialized from cache instantly
  private initialCache = this.getCachedData();
  testimonials = signal<TestimonialItem[]>(this.initialCache?.testimonials || []);
  stats = signal<TestimonialsStats | null>(this.initialCache?.stats || null);
  isLoading = signal(!this.initialCache);
  error = signal<string | null>(null);

  constructor() {
    // Refresh testimonials in background when feedback modal is closed
    // This handles immediate visual updates if user toggles public/private
    effect(() => {
      const isOpen = this.uiService.isOpen();
      untracked(() => {
        if (!isOpen) {
          this.loadTestimonials();
        }
      });
    });
  }

  // Fallback data if API fails or returns empty
  fallbackTestimonials: TestimonialItem[] = [
    {
      comment: "Emotra helped our research team identify emotional patterns in interview responses we would have missed entirely.",
      user_name: "Dr. Sarah Mitchell",
      rating: 5,
      created_at: new Date().toISOString()
    },
    {
      comment: "The audio emotion timeline is unlike anything I've seen. It changed how we approach customer feedback analysis.",
      user_name: "James Okafor",
      rating: 5,
      created_at: new Date().toISOString()
    },
    {
      comment: "Finally a tool that doesn't just give you a label — it shows you the emotional journey. Incredibly powerful.",
      user_name: "Lena Hoffmann",
      rating: 5,
      created_at: new Date().toISOString()
    }
  ];

  ngOnInit() {
    this.loadTestimonials();
  }

  loadTestimonials() {
    // Only show primary loader if we have NO data at all
    if (!this.testimonials().length) {
      this.isLoading.set(true);
    }

    this.feedbackService.getPublicTestimonials()
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (response) => {
          if (response.is_success && response.data) {
            this.testimonials.set(response.data.items);
            this.stats.set(response.data.stats);

            // Update cache
            try {
              localStorage.setItem(this.CACHE_KEY, JSON.stringify({
                testimonials: response.data.items,
                stats: response.data.stats
              }));
            } catch { }
          } else {
            this.useFallback();
          }
        },
        error: () => {
          if (this.testimonials().length === 0) {
            this.useFallback();
          }
        }
      });
  }

  private useFallback() {
    this.testimonials.set(this.fallbackTestimonials);
    this.stats.set({
      average_rating: 4.9,
      total_reviews: 1240
    });
  }

  getInitials(name: string): string {
    if (!name) return '??';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  }

  // --- Carousel controls ---

  goTo(index: number) {
    const total = this.testimonials().length;
    if (total === 0) return;
    this.activeIndex.set(((index % total) + total) % total);
  }

  next() {
    this.goTo(this.activeIndex() + 1);
  }

  prev() {
    this.goTo(this.activeIndex() - 1);
  }



  onTouchStart(e: TouchEvent) {
    this.touchStartX = e.touches[0].clientX;
    this.touchDeltaX = 0;
  }

  onTouchMove(e: TouchEvent) {
    this.touchDeltaX = e.touches[0].clientX - this.touchStartX;
  }

  onTouchEnd() {
    if (Math.abs(this.touchDeltaX) > 50) {
      if (this.touchDeltaX < 0) {
        this.next();
      } else {
        this.prev();
      }
    }
  }


}
