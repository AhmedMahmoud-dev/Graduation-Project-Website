import { Component, inject, OnInit } from '@angular/core';
import { ViewportScroller } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { AppSidebarComponent } from '../../layouts/app-layout/app-sidebar/app-sidebar.component';
import { AppNavbarComponent } from '../../layouts/app-layout/app-navbar/app-navbar.component';
import { HeroSectionComponent } from './hero-section/hero-section.component';
import { FeaturesSectionComponent } from './features-section/features-section.component';
import { HowItWorksSectionComponent } from './how-it-works-section/how-it-works-section.component';
import { PricingSectionComponent } from './pricing-section/pricing-section.component';
import { TestimonialsSectionComponent } from './testimonials-section/testimonials-section.component';
import { FAQSectionComponent } from './faq-section/faq-section.component';
import { FooterSectionComponent } from '../../shared/components/footer/footer.component';
import { SystemFeedbackComponent } from '../../shared/components/system-feedback/system-feedback.component';
import { SeoService } from '../../core/services/seo.service';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [
    AppSidebarComponent,
    AppNavbarComponent,
    HeroSectionComponent,
    FeaturesSectionComponent,
    HowItWorksSectionComponent,
    PricingSectionComponent,
    FooterSectionComponent,
    TestimonialsSectionComponent,
    FAQSectionComponent,
    SystemFeedbackComponent
  ],
  templateUrl: './landing.component.html'
})
export class LandingComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private viewportScroller = inject(ViewportScroller);
  private seoService = inject(SeoService);

  ngOnInit() {
    this.seoService.updateMeta({
      title: 'Emotra — AI Emotion Detection Platform',
      description: 'Emotra analyzes human emotions from text, audio, image, and video using advanced AI models. Track how emotions evolve over time with interactive timelines.',
      url: 'https://graduation-project-website-eight.vercel.app/'
    });

    this.route.fragment.subscribe(fragment => {
      if (fragment) {
        // Small delay to allow components to render
        setTimeout(() => {
          this.viewportScroller.scrollToAnchor(fragment);
        }, 100);
      }
    });
  }
}
