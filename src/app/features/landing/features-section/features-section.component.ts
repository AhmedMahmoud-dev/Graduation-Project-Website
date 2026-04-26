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
      title: 'Image Analysis',
      description: 'Detect facial expressions and emotional cues in static images with computer vision.',
      icon: 'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z',
      status: 'coming-soon',
      link: '/models/image',
      category: 'Visual'
    },
    {
      title: 'Video Analysis',
      description: 'Real-time emotion tracking across video frames for dynamic sentiment mapping.',
      icon: 'M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z',
      status: 'coming-soon',
      link: '/models/video',
      category: 'Multimodal'
    }
  ];

  constructor(private router: Router) {}

  onFeatureClick(feature: Feature) {
    if (feature.status === 'coming-soon') return;
    this.router.navigate([feature.link]);
  }
}
