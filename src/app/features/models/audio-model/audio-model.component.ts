import { Component, signal, OnInit, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FooterSectionComponent } from '../../../shared/components/footer/footer.component';
import { AudioModelV1Component } from './v1/audio-model-v1.component';
import { AudioModelV2Component } from './v2/audio-model-v2.component';
import { SegmentedNavComponent } from '../../../shared/components/segmented-nav/segmented-nav.component';

@Component({
  selector: 'app-audio-model',
  standalone: true,
  imports: [
    RouterModule,
    FooterSectionComponent,
    AudioModelV1Component,
    AudioModelV2Component,
    SegmentedNavComponent
  ],
  templateUrl: './audio-model.component.html',
  styleUrl: './audio-model.component.css'
})
export class AudioModelComponent implements OnInit {
  private isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  selectedVersion = signal<'v1' | 'v2'>('v2');

  navOptions = [
    { label: 'V2 (Production)', value: 'v2' },
    { label: 'V1 (Legacy)', value: 'v1' }
  ];


  ngOnInit(): void {
    if (this.isBrowser) {
      window.scrollTo(0, 0);
    }
  }

  setVersion(version: 'v1' | 'v2'): void {
    this.selectedVersion.set(version);
    if (this.isBrowser) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }
}
