import { Component } from '@angular/core';

import { Router, RouterModule } from '@angular/router';

interface Feature {
  title: string;
  description: string;
  icon: string;
  status: 'available' | 'coming-soon';
  link: string;
  category: string;
}

@Component({
  selector: 'app-features-section',
  standalone: true,
  imports: [RouterModule],
  templateUrl: './features-section.component.html'
})
export class FeaturesSectionComponent {
  features: Feature[] = [
    {
      title: 'Text Analysis',
      description: 'Analyze the emotional content of text using our fine-tuned transformer models.',
      icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
      status: 'available',
      link: '/models/text',
      category: 'Semantic'
    },
    {
      title: 'Audio Analysis',
      description: 'Track emotional intensity and sentiment through voice prosody and speech patterns.',
      icon: 'M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z',
      status: 'available',
      link: '/models/audio',
      category: 'Acoustic'
    },
    {
      title: 'Image & Video Analysis',
      description: 'Analyze facial expressions in static images and track emotional transitions across video timelines.',
      icon: 'M3 21h18a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2H3a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2z M10 8.5l5.5 3.5l-5.5 3.5z',
      status: 'available',
      link: '/models/image-video',
      category: 'Visual & Multimodal'
    }
  ];

  constructor(private router: Router) {}

  onFeatureClick(feature: Feature) {
    if (feature.status === 'coming-soon') return;
    this.router.navigate([feature.link]);
  }
}
