import { Component, Input, Output, EventEmitter, signal, inject, computed, effect, OnDestroy, ViewChild, ElementRef, untracked, HostListener, PLATFORM_ID, OnChanges, SimpleChanges, AfterViewInit, SecurityContext } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { ThemeService } from '../../../core/services/theme.service';

@Component({
  selector: 'app-audio-player',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './audio-player.component.html',
  styleUrls: ['./audio-player.component.css']
})
export class AudioPlayerComponent implements OnDestroy, OnChanges, AfterViewInit {
  private sanitizer = inject(DomSanitizer);
  private themeService = inject(ThemeService);
  private platformId = inject(PLATFORM_ID);
  private isBrowser = isPlatformBrowser(this.platformId);

  @Input() src: SafeUrl | string | null = null;
  @Input() blob: Blob | File | null = null;
  @Input() filename: string = '';
  @Input() showRemoveButton: boolean = false;
  @Output() remove = new EventEmitter<void>();

  @ViewChild('previewCanvas') previewCanvas?: ElementRef<HTMLCanvasElement>;
  @ViewChild('audioElement') audioElement?: ElementRef<HTMLAudioElement>;

  // Playback State
  isPlaying = signal<boolean>(false);
  currentTime = signal<number>(0);
  duration = signal<number>(0);
  peaks: number[] = [];
  
  private playbackAnimationId?: number;
  private drawRetryCount = 0;

  constructor() {
    // Watch for theme changes to redraw waveform
    effect(() => {
      this.themeService.resolvedTheme(); // track the signal
      untracked(() => {
        if (this.previewCanvas) {
          this.drawWaveform(true);
        }
      });
    });
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['src'] || changes['blob']) {
      this.isPlaying.set(false);
      this.currentTime.set(0);
      this.duration.set(0);
      this.peaks = [];
      this.drawRetryCount = 0;
      this.loadAudioAndGeneratePeaks();
    }
  }

  ngAfterViewInit() {
    if (this.peaks.length > 0) {
      this.drawWaveform(true);
    }
  }

  ngOnDestroy() {
    this.stopSmoothPlaybackLoop();
  }

  @HostListener('window:resize')
  onResize() {
    this.drawWaveform(true);
  }

  async loadAudioAndGeneratePeaks() {
    if (!this.blob && !this.src) return;
    if (!this.isBrowser) return;

    try {
      let arrayBuffer: ArrayBuffer;

      if (this.blob) {
        arrayBuffer = await this.blob.arrayBuffer();
      } else {
        // Resolve string URL from SafeUrl if necessary
        let urlStr = '';
        if (typeof this.src === 'string') {
          urlStr = this.src;
        } else if (this.src) {
          const safeStr = String(this.src);
          if (safeStr.includes('SafeValue')) {
            const match = safeStr.match(/binding:\s*([^(]+)/) || safeStr.match(/binding:\s*([^\s]+)/);
            if (match && match[1]) {
              urlStr = match[1].trim();
            }
          }
          if (!urlStr) {
            urlStr = (this.src as any).changingThisBreaksApplicationSecurity || 
                     this.sanitizer.sanitize(SecurityContext.URL, this.src) || '';
            if (urlStr.startsWith('unsafe:')) {
              urlStr = urlStr.substring(7);
            }
          }
        }

        if (!urlStr) return;

        const response = await fetch(urlStr);
        arrayBuffer = await response.arrayBuffer();
      }
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      if (audioCtx.state === 'suspended') {
        await audioCtx.resume();
      }

      const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
      audioCtx.close();
      this.duration.set(audioBuffer.duration);

      const data = audioBuffer.getChannelData(0);
      const sampleCount = 150;
      const samplesPerBar = Math.floor(data.length / sampleCount);
      const peaks: number[] = [];

      for (let i = 0; i < sampleCount; i++) {
        let max = 0;
        for (let j = 0; j < samplesPerBar; j++) {
          const val = Math.abs(data[i * samplesPerBar + j] || 0);
          if (val > max) max = val;
        }
        peaks.push(max);
      }

      this.peaks = peaks;
      this.drawRetryCount = 0;
      setTimeout(() => this.drawWaveform(true), 60);
    } catch (err) {
      console.error('AudioPlayer: Waveform generation failed:', err);
    }
  }

  drawWaveform(forceResize = false) {
    if (!this.previewCanvas || !this.peaks.length || !this.isBrowser) return;

    const canvas = this.previewCanvas.nativeElement;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0) {
      if (this.drawRetryCount < 10) {
        this.drawRetryCount++;
        setTimeout(() => this.drawWaveform(forceResize), 150);
      }
      return;
    }
    this.drawRetryCount = 0;

    if (forceResize || canvas.width !== rect.width * dpr || canvas.height !== rect.height * dpr) {
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
    }

    const width = canvas.width / dpr;
    const height = canvas.height / dpr;
    ctx.clearRect(0, 0, width, height);

    const brandColor = getComputedStyle(document.documentElement)
      .getPropertyValue('--brand-primary').trim() || '#6c63ff';
    const mutedColor = this.themeService.resolvedTheme() === 'dark'
      ? 'rgba(255,255,255,0.1)'
      : 'rgba(0,0,0,0.07)';

    const progress = this.currentTime() / (this.duration() || 1);
    const progressIndex = Math.floor(this.peaks.length * progress);

    const barCount = this.peaks.length;
    const spacing = width / barCount;
    const barWidth = Math.max(1, spacing * 0.7);

    this.peaks.forEach((peak, i) => {
      const barHeight = Math.max(3, peak * height * 0.9);
      const x = i * spacing;
      const y = (height - barHeight) / 2;
      ctx.fillStyle = i < progressIndex ? brandColor : mutedColor;
      this.fillRoundedRect(ctx, x, y, barWidth, barHeight, 1.5);
    });
  }

  onWaveformClick(event: MouseEvent) {
    if (!this.previewCanvas) return;
    const canvas = this.previewCanvas.nativeElement;
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const percentage = x / rect.width;

    const audio = this.audioElement?.nativeElement;
    if (audio && audio.duration) {
      audio.currentTime = percentage * audio.duration;
      this.drawWaveform();
    }
  }

  private fillRoundedRect(
    ctx: CanvasRenderingContext2D,
    x: number, y: number,
    w: number, h: number,
    r: number
  ) {
    if (h < r * 2) r = h / 2;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
    ctx.fill();
  }

  togglePlayback() {
    const audio = this.audioElement?.nativeElement;
    if (!audio) return;
    if (this.isPlaying()) {
      audio.pause();
    } else {
      audio.play().catch(err => console.error('AudioPlayer play failed:', err));
    }
  }

  onAudioTimeUpdate() {
    const audio = this.audioElement?.nativeElement;
    if (audio) {
      this.currentTime.set(audio.currentTime);
      if (isFinite(audio.duration) && audio.duration > 0) {
        this.duration.set(audio.duration);
      }
      this.drawWaveform();
    }
  }

  onAudioLoadedMetadata() {
    const audio = this.audioElement?.nativeElement;
    if (!audio) return;

    // Workaround for Chrome WebM Blob duration bug (duration === Infinity)
    if (audio.duration === Infinity) {
      audio.currentTime = 1e10; // Seek to massive number

      const resolveDuration = () => {
        if (audio.duration !== Infinity) {
          audio.currentTime = 0; // Seek back to start
          this.duration.set(audio.duration);
          this.drawWaveform();
          audio.removeEventListener('durationchange', resolveDuration);
        }
      };
      audio.addEventListener('durationchange', resolveDuration);
      return;
    }

    if (isFinite(audio.duration) && audio.duration > 0) {
      this.duration.set(audio.duration);
    }
  }

  onAudioPlay() {
    this.isPlaying.set(true);
    this.startSmoothPlaybackLoop();
  }

  onAudioPause() {
    this.isPlaying.set(false);
    this.stopSmoothPlaybackLoop();
  }

  onAudioEnded() {
    this.isPlaying.set(false);
    this.stopSmoothPlaybackLoop();
    this.currentTime.set(0);
    this.drawWaveform();
  }

  private startSmoothPlaybackLoop() {
    if (this.playbackAnimationId) cancelAnimationFrame(this.playbackAnimationId);

    const loop = () => {
      const audio = this.audioElement?.nativeElement;
      if (audio && !audio.paused) {
        this.currentTime.set(audio.currentTime);
        this.duration.set(audio.duration || 0);
        this.drawWaveform();
        this.playbackAnimationId = requestAnimationFrame(loop);
      }
    };
    this.playbackAnimationId = requestAnimationFrame(loop);
  }

  private stopSmoothPlaybackLoop() {
    if (this.playbackAnimationId) {
      cancelAnimationFrame(this.playbackAnimationId);
      this.playbackAnimationId = undefined;
    }
  }

  formatDuration(seconds: number): string {
    if (isNaN(seconds) || !isFinite(seconds) || seconds < 0) {
      return '00:00';
    }
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  onRemoveClick() {
    this.remove.emit();
  }
}
