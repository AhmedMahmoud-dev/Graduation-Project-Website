import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FooterSectionComponent } from '../../../shared/components/footer/footer.component';

@Component({
  selector: 'app-model-details',
  standalone: true,
  imports: [CommonModule, RouterModule, FooterSectionComponent],
  templateUrl: './model-details.component.html',
  styleUrl: './model-details.component.css'
})
export class ModelDetailsComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  modelType = '';
  modelTitle = '';
  modelIcon = '';

  ngOnInit() {
    this.route.params.subscribe(params => {
      this.modelType = params['type'] || 'text';
      this.setModelData();
    });
  }

  setModelData() {
    switch (this.modelType) {
      case 'text':
        this.modelTitle = 'Text';
        this.modelIcon = `<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="8" y="4" width="32" height="40" rx="4" fill="none"/><path d="M16 16h16M16 24h16M16 32h8" /></svg>`;
        break;
      case 'audio':
        this.modelTitle = 'Audio';
        this.modelIcon = `<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M24 10v28M16 18v12M8 22v4M32 16v16M40 20v8" /><circle cx="24" cy="24" r="20" stroke="currentColor" stroke-opacity="0.2"/></svg>`;
        break;
      case 'image':
        this.modelTitle = 'Image';
        this.modelIcon = `<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="8" width="36" height="32" rx="6"/><circle cx="24" cy="24" r="8"/><path d="M19 21c1.5-1.5 3.5-1.5 5 0" /></svg>`;
        break;
      case 'video':
        this.modelTitle = 'Video';
        this.modelIcon = `<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="10" width="40" height="28" rx="4"/><path d="M4 16h40M4 32h40M12 10v28M36 10v28" stroke-opacity="0.3"/><polygon points="20 18 30 24 20 30" fill="currentColor" fill-opacity="0.2"/></svg>`;
        break;
      default:
        this.router.navigate(['/']);
    }
  }

  goBack() {
    this.router.navigate(['/']);
  }
}
