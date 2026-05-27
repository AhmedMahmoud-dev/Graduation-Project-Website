import { Component, Input, ViewChild, ElementRef, OnInit, OnDestroy, AfterViewInit, OnChanges, SimpleChanges, HostListener, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SafeUrl } from '@angular/platform-browser';

@Component({
  selector: 'app-video-player',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './video-player.component.html',
  styleUrls: ['./video-player.component.css']
})
export class VideoPlayerComponent implements OnInit, OnDestroy, AfterViewInit, OnChanges {
  @Input() src: SafeUrl | string | null = null;
  @Input() maxHeight: string = '360px';

  private _duration = 0;
  @Input()
  set duration(value: number | null | undefined) {
    if (value && isFinite(value) && value > 0) {
      this._duration = value;
      this.syncSliderDOM();
    }
  }
  get duration(): number {
    return this._duration;
  }

  @ViewChild('videoElement') videoElement!: ElementRef<HTMLVideoElement>;
  @ViewChild('playerContainer') playerContainer!: ElementRef<HTMLDivElement>;
  @ViewChild('progressBar') progressBar!: ElementRef<HTMLInputElement>;
  @ViewChild('timeDisplay') timeDisplay!: ElementRef<HTMLSpanElement>;

  isPlaying = false;
  isMuted = false;
  currentTime = 0;
  volume = 1;
  controlsVisible = true;
  isFullscreen = false;

  private controlsTimeout?: any;
  private rafId: number | null = null;
  private ngZone: NgZone;

  constructor(ngZone: NgZone) {
    this.ngZone = ngZone;
  }

  ngOnInit() {
    this.showControlsWithTimeout();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['src']) {
      this.currentTime = 0;
      this._duration = 0;
      this.isPlaying = false;
      this.stopRAF();
      // Reset slider DOM directly
      if (this.progressBar) {
        const slider = this.progressBar.nativeElement;
        slider.value = '0';
        slider.max = '100';
        slider.style.backgroundSize = '0% 100%';
      }
      if (this.timeDisplay) {
        this.timeDisplay.nativeElement.textContent = '00:00 / 00:00';
      }
    }
  }

  ngAfterViewInit() {
    const video = this.videoElement.nativeElement;
    if (video) {
      // If metadata is already loaded
      if (video.readyState >= 1) {
        this.refreshDuration(video);
        this.currentTime = video.currentTime || 0;
      }
      this.syncSliderDOM();

      // Add robust native event listeners
      video.addEventListener('loadedmetadata', () => this.onLoadedMetadata());
      video.addEventListener('durationchange', () => this.onLoadedMetadata());
      video.addEventListener('loadeddata', () => this.onLoadedMetadata());
      video.addEventListener('play', () => this.onPlay());
      video.addEventListener('pause', () => this.onPause());
      video.addEventListener('ended', () => this.onEnded());
    }
  }

  ngOnDestroy() {
    if (this.controlsTimeout) {
      clearTimeout(this.controlsTimeout);
    }
    this.stopRAF();
  }

  @HostListener('document:fullscreenchange', [])
  @HostListener('document:webkitfullscreenchange', [])
  @HostListener('document:mozfullscreenchange', [])
  @HostListener('document:MSFullscreenChange', [])
  onFullscreenChange() {
    this.isFullscreen = !!document.fullscreenElement;
  }

  togglePlay() {
    const video = this.videoElement.nativeElement;
    if (video.paused) {
      video.play().catch(err => console.error('Error playing video:', err));
    } else {
      video.pause();
    }
    this.showControlsWithTimeout();
  }

  onPlay() {
    this.isPlaying = true;
    const video = this.videoElement.nativeElement;
    if (!this._duration && video.readyState >= 1) {
      this.refreshDuration(video);
    }
    this.startRAF();
    this.showControlsWithTimeout();
  }

  onPause() {
    this.isPlaying = false;
    this.stopRAF();
    // Do one final sync so the slider lands on exact pause position
    this.readVideoAndSync();
    this.showControlsWithTimeout();
  }

  toggleMute() {
    const video = this.videoElement.nativeElement;
    this.isMuted = !this.isMuted;
    video.muted = this.isMuted;
    this.showControlsWithTimeout();
  }

  onVolumeChange(event: Event) {
    const target = event.target as HTMLInputElement;
    const val = parseFloat(target.value);
    this.volume = val;
    
    const video = this.videoElement.nativeElement;
    video.volume = val;
    if (val === 0) {
      this.isMuted = true;
      video.muted = true;
    } else {
      this.isMuted = false;
      video.muted = false;
    }
    this.showControlsWithTimeout();
  }

  onSeek(event: Event) {
    const target = event.target as HTMLInputElement;
    const val = parseFloat(target.value);
    this.currentTime = val;
    
    const video = this.videoElement.nativeElement;
    video.currentTime = val;
    this.syncSliderDOM();
    this.showControlsWithTimeout();
  }

  onLoadedMetadata() {
    const video = this.videoElement.nativeElement;
    
    // Workaround for Chrome WebM Blob duration bug
    if (video.duration === Infinity) {
      // Seek to a massive number to force browser to calculate true duration
      video.currentTime = 1e10; 
      
      const resolveDuration = () => {
        if (video.duration !== Infinity) {
          video.currentTime = 0; // Reset back to start
          this.refreshDuration(video);
          this.syncSliderDOM();
          video.removeEventListener('durationchange', resolveDuration);
        }
      };
      video.addEventListener('durationchange', resolveDuration);
      return;
    }

    this.refreshDuration(video);
    this.syncSliderDOM();
  }

  private refreshDuration(video: HTMLVideoElement) {
    const d = video.duration;
    if (d && isFinite(d) && d > 0) {
      this._duration = d;
    }
  }

  onEnded() {
    this.isPlaying = false;
    this.stopRAF();
    // Snap slider to the very end
    this.currentTime = this.duration;
    this.syncSliderDOM();
    this.showControlsWithTimeout();
  }

  /**
   * Directly set the progress slider's value, max, and background-size
   * on the DOM element. This bypasses Angular change detection entirely,
   * which is critical because the RAF loop runs outside NgZone.
   */
  private syncSliderDOM() {
    if (!this.progressBar) return;
    const slider = this.progressBar.nativeElement;
    const dur = this._duration || 0;
    const time = this.currentTime || 0;

    const fillPercent = dur > 0 ? (time / dur) * 100 : 0;
    const clamped = Math.max(0, Math.min(100, fillPercent));

    slider.max = dur > 0 ? dur.toString() : '100';
    slider.value = dur > 0 ? time.toString() : '0';
    slider.style.backgroundSize = clamped + '% 100%';

    if (this.timeDisplay) {
      this.timeDisplay.nativeElement.textContent =
        `${this.formatTime(time)} / ${this.formatTime(dur)}`;
    }
  }

  /**
   * Read the current time/duration from the video and sync the slider.
   * Used for one-off updates (pause, seek, metadata load).
   */
  private readVideoAndSync() {
    const video = this.videoElement?.nativeElement;
    if (!video) return;
    this.currentTime = video.currentTime;
    this.refreshDuration(video);
    this.syncSliderDOM();
  }

  formatTime(seconds: number): string {
    if (isNaN(seconds) || seconds === Infinity) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  toggleFullscreen() {
    const container = this.playerContainer.nativeElement;
    if (!document.fullscreenElement) {
      container.requestFullscreen().catch(err => {
        console.error('Fullscreen request failed:', err);
      });
    } else {
      document.exitFullscreen();
    }
    this.showControlsWithTimeout();
  }

  showControlsWithTimeout() {
    this.controlsVisible = true;
    if (this.controlsTimeout) {
      clearTimeout(this.controlsTimeout);
    }
    if (this.isPlaying) {
      this.controlsTimeout = setTimeout(() => {
        this.controlsVisible = false;
      }, 2500);
    }
  }

  hideControls() {
    if (this.isPlaying) {
      this.controlsVisible = false;
    }
  }

  /* ---- requestAnimationFrame loop for frame-perfect slider ---- */
  private startRAF() {
    this.stopRAF();
    this.ngZone.runOutsideAngular(() => {
      const tick = () => {
        const video = this.videoElement?.nativeElement;
        if (video) {
          this.currentTime = video.currentTime;
          const d = video.duration;
          if (d && isFinite(d) && d > 0) {
            this._duration = d;
          }
          this.syncSliderDOM();
        }
        this.rafId = requestAnimationFrame(tick);
      };
      this.rafId = requestAnimationFrame(tick);
    });
  }

  private stopRAF() {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }
}
