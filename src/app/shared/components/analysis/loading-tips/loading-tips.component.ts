import { Component, Input, OnInit, OnDestroy, inject, PLATFORM_ID, HostListener } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

@Component({
  selector: 'app-loading-tips',
  standalone: true,
  imports: [],
  templateUrl: './loading-tips.component.html',
  styleUrl: './loading-tips.component.css'
})
export class LoadingTipsComponent implements OnInit, OnDestroy {
  @Input() tips: string[] = [];
  @Input() title: string = 'Did you know?';

  currentTipIndex = 0;
  previousTipIndex = -1;
  isPaused = false;

  private intervalId: any;
  private isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private tipDuration = 4000;

  ngOnInit() {
    if (this.isBrowser && this.tips.length > 1) {
      this.startInterval();
    }
  }

  ngOnDestroy() {
    this.stopInterval();
  }

  startInterval() {
    if (this.intervalId) return;
    this.intervalId = setInterval(() => {
      this.previousTipIndex = this.currentTipIndex;
      this.currentTipIndex = (this.currentTipIndex + 1) % this.tips.length;
    }, this.tipDuration);
  }

  stopInterval() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  pause() {
    this.isPaused = true;
    this.stopInterval();
  }

  resume() {
    if (this.isPaused) {
      this.isPaused = false;
      this.startInterval();
    }
  }
}
