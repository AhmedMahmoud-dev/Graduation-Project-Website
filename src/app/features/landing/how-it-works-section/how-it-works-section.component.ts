import { Component } from '@angular/core';

interface Step {
  number: number;
  title: string;
  description: string;
  icon: string;
}

@Component({
  selector: 'app-how-it-works-section',
  standalone: true,
  templateUrl: './how-it-works-section.component.html',
  styleUrl: './how-it-works-section.component.css'
})
export class HowItWorksSectionComponent {
  steps: Step[] = [
    {
      number: 1,
      title: 'Capture Content',
      description: 'Seamlessly upload text, audio, image, or video directly into our secure ingestion engine.',
      icon: 'M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12'
    },
    {
      number: 2,
      title: 'Neural Processing',
      description: 'Our advanced Transformer-based AI models analyze sentiments with unprecedented precision.',
      icon: 'M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z'
    },
    {
      number: 3,
      title: 'Actionable Insights',
      description: 'Explore dynamic timelines and deep-dive analytics to understand behavioral evolution.',
      icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z'
    }
  ];
}
