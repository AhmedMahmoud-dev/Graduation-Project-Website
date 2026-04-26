import { Component, Input, ElementRef, ViewChild, OnDestroy, AfterViewInit, inject, HostListener } from '@angular/core';

import { ThemeService } from '../../../core/services/theme.service';

@Component({
  selector: 'app-audio-waveform',
  standalone: true,
  imports: [],
  templateUrl: './app-audio-waveform.html',
  styleUrl: './app-audio-waveform.css'
})
export class AudioWaveformComponent implements OnDestroy, AfterViewInit {
  @ViewChild('waveformCanvas') canvasRef!: ElementRef<HTMLCanvasElement>;

  @Input() set isRecording(value: boolean) {
    this._isRecording = value;
    // Wait for view to be ready before acting
    if (this._viewReady) {
      if (value) {
        this.startVisualization();
      } else {
        this.stopVisualization();
      }
    }
  }
  get isRecording(): boolean { return this._isRecording; }
  private _isRecording = false;
  private _viewReady = false;

  private audioContext?: AudioContext;
  private analyser?: AnalyserNode;
  private dataArray?: Uint8Array<ArrayBuffer>;
  private animationId?: number;
  private stream?: MediaStream;

  private themeService = inject(ThemeService);

  ngAfterViewInit() {
    this._viewReady = true;
    this.resizeCanvas();
    // If isRecording was set before view init, start now
    if (this._isRecording) {
      this.startVisualization();
    } else {
      this.drawIdleState();
    }
  }

  ngOnDestroy() {
    this.stopVisualization();
  }

  @HostListener('window:resize')
  onResize() {
    this.resizeCanvas();
    if (!this._isRecording) {
      this.drawIdleState();
    }
  }

  private resizeCanvas() {
    const canvas = this.canvasRef.nativeElement;
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0) return;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    const ctx = canvas.getContext('2d');
    if (ctx) ctx.scale(dpr, dpr);
  }

  /** Draw a subtle flat/idle bars state when not recording */
  private drawIdleState() {
    if (!this.canvasRef) return;
    const canvas = this.canvasRef.nativeElement;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const width = canvas.width / dpr;
    const height = canvas.height / dpr;
    ctx.clearRect(0, 0, width, height);

    const primaryColor = getComputedStyle(document.documentElement)
      .getPropertyValue('--brand-primary').trim() || '#6c63ff';

    const barWidth = 3;
    const gap = 2;
    const barCount = Math.floor(width / (barWidth + gap));

    ctx.fillStyle = this.themeService.resolvedTheme() === 'dark'
      ? 'rgba(255,255,255,0.08)'
      : 'rgba(0,0,0,0.06)';

    for (let i = 0; i < barCount; i++) {
      const barHeight = Math.max(3, (Math.sin(i * 0.3) * 0.5 + 0.5) * height * 0.15 + 3);
      const x = i * (barWidth + gap);
      const y = (height - barHeight) / 2;
      this.fillRoundedRect(ctx, x, y, barWidth, barHeight, 1.5);
    }
  }

  private async startVisualization() {
    // Cancel any existing animation
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = undefined;
    }

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });

      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const source = this.audioContext.createMediaStreamSource(this.stream);

      this.analyser = this.audioContext.createAnalyser();
      // Use fftSize 256 → frequencyBinCount = 128 bars of data
      this.analyser.fftSize = 256;
      this.analyser.smoothingTimeConstant = 0.5;

      source.connect(this.analyser);

      // We use frequencyBinCount (128) for frequency data
      const bufferLength = this.analyser.frequencyBinCount;
      this.dataArray = new Uint8Array(new ArrayBuffer(bufferLength));

      this.drawLoop();
    } catch (err) {
      console.error('Microphone access error:', err);
    }
  }

  private stopVisualization() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = undefined;
    }

    if (this.stream) {
      this.stream.getTracks().forEach(t => t.stop());
      this.stream = undefined;
    }

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = undefined;
    }

    this.analyser = undefined;
    this.dataArray = undefined;

    // Reset canvas to idle
    if (this.canvasRef) {
      this.drawIdleState();
    }
  }

  private drawLoop = () => {
    if (!this._isRecording || !this.analyser || !this.dataArray) return;

    this.animationId = requestAnimationFrame(this.drawLoop);

    // Pull FREQUENCY data — this gives amplitude per frequency band
    this.analyser.getByteFrequencyData(this.dataArray);

    const canvas = this.canvasRef.nativeElement;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const width = canvas.width / dpr;
    const height = canvas.height / dpr;

    ctx.clearRect(0, 0, width, height);

    const primaryColor = getComputedStyle(document.documentElement)
      .getPropertyValue('--brand-primary').trim() || '#6c63ff';

    const barWidth = 3;
    const gap = 2;
    const barCount = Math.floor(width / (barWidth + gap));

    // We only use the lower half of frequency bins (more useful for voice)
    const usableBins = Math.floor(this.dataArray.length * 0.6);

    ctx.shadowBlur = this.themeService.resolvedTheme() === 'dark' ? 12 : 4;
    ctx.shadowColor = primaryColor;
    ctx.fillStyle = primaryColor;

    for (let i = 0; i < barCount; i++) {
      // Map bar index to data bin — use left half of bars to mirror
      const halfCount = barCount / 2;
      const distFromCenter = Math.abs(i - halfCount);
      // Center bars get lower frequencies, edges get higher
      const binIdx = Math.floor((distFromCenter / halfCount) * usableBins);
      const value = this.dataArray[Math.min(binIdx, this.dataArray.length - 1)];

      const amplitude = value / 255;
      // Minimum 3px so it's always visible
      const barHeight = Math.max(3, amplitude * height * 0.9);

      const x = i * (barWidth + gap);
      const y = (height - barHeight) / 2;

      this.fillRoundedRect(ctx, x, y, barWidth, barHeight, 1.5);
    }

    ctx.shadowBlur = 0;
  };

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
}
