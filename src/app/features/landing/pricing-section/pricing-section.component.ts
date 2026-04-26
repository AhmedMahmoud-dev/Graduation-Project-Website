import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-pricing-section',
  standalone: true,
  templateUrl: './pricing-section.component.html'
})
export class PricingSectionComponent {
  constructor(private router: Router) {}

  freeFeatures = [
    '10 Daily Analyses',
    'Text & Audio Models',
    'Analysis History',
    'Compare Results',
    'Custom Theme Colors',
    'Smart Alerts'
  ];

  proFeatures = [
    'Unlimited Analysis',
    'Multi-modal Timelines',
    'API Access',
    'Batch Analysis',
    'Export Reports',
    'Priority Support'
  ];

  navigateToRegister() {
    this.router.navigate(['/auth/register']);
  }
}
