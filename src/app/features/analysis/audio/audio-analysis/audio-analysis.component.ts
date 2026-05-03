import { Component, signal, inject, computed, effect, OnDestroy, ViewChild, ElementRef, untracked, HostListener, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

import { FormsModule } from '@angular/forms';
import { Observable } from 'rxjs';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';

import { ThemeService } from '../../../../core/services/theme.service';
import { AudioAnalysisService } from '../../../../core/services/audio-analysis.service';
import { AudioAnalysisResponse, AudioSegment } from '../../../../core/models/audio-analysis.model';
import { ApiResponse } from '../../../../core/models/api-response.model';
import { AudioWaveformComponent } from '../../../../shared/components/audio-waveform/app-audio-waveform';
import { EmotionIconComponent } from '../../../../shared/components/emotion-icon/emotion-icon.component';
import { FooterSectionComponent } from '../../../../shared/components/footer/footer.component';
import { EmotionTimelineComponent } from '../../../../shared/components/emotion-charts/emotion-timeline/emotion-timeline.component';
import { EmotionDistributionComponent } from '../../../../shared/components/emotion-charts/emotion-distribution/emotion-distribution.component';
import { DominantEmotionHeroComponent } from '../../../../shared/components/analysis/dominant-emotion-hero/dominant-emotion-hero.component';
import { SessionTopBarComponent } from '../../../../shared/components/analysis/session-top-bar/session-top-bar.component';
import { AnalysisBreakdownCardComponent } from '../../../../shared/components/analysis/analysis-breakdown-card/analysis-breakdown-card.component';
import { RawJsonSectionComponent } from '../../../../shared/components/analysis/raw-json-section/raw-json-section.component';
import { ModelInfoGridComponent } from '../../../../shared/components/analysis/model-info-grid/model-info-grid.component';
import { LoadingTipsComponent } from '../../../../shared/components/analysis/loading-tips/loading-tips.component';
import { LoadingStateComponent } from '../../../../shared/components/loading-state/loading-state.component';
import { PageHeaderComponent } from '../../../../shared/components/layout/page-header/page-header.component';
import { AnalysisFeedbackComponent } from '../../../../shared/components/analysis-feedback/analysis-feedback.component';
import { SegmentedNavComponent, SegmentedNavOption } from '../../../../shared/components/segmented-nav/segmented-nav.component';
import { AnalysisSectionHeaderComponent } from '../../../../shared/components/analysis-section-header/analysis-section-header.component';
import { TimelineDataPoint, DistributionDataPoint } from '../../../../core/models/chart-data.model';

import { BaseAnalysisComponent } from '../../../../shared/base/base-analysis.component';

type InputTab = 'upload' | 'record';

@Component({
  selector: 'app-audio-analysis',
  standalone: true,
  imports: [
    FormsModule,
    AudioWaveformComponent,
    EmotionIconComponent,
    FooterSectionComponent,
    EmotionTimelineComponent,
    EmotionDistributionComponent,
    DominantEmotionHeroComponent,
    SessionTopBarComponent,
    AnalysisBreakdownCardComponent,
    RawJsonSectionComponent,
    ModelInfoGridComponent,
    LoadingTipsComponent,
    LoadingStateComponent,
    PageHeaderComponent,
    AnalysisFeedbackComponent,
    SegmentedNavComponent,
    AnalysisSectionHeaderComponent

  ],
  templateUrl: './audio-analysis.component.html',
  styleUrls: ['./audio-analysis.component.css']
})
export class AudioAnalysisComponent extends BaseAnalysisComponent<AudioAnalysisResponse> implements OnDestroy {
  private audioService = inject(AudioAnalysisService);
  private sanitizer = inject(DomSanitizer);
  private themeService = inject(ThemeService);
  private isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  // ─── Base Contract ────────────────────────────────────────────────
  protected readonly analysisType = 'audio' as const;
  protected readonly analysisRoute = '/analysis/audio';
  protected readonly expectedApiType = 'Audio';

  @ViewChild('previewCanvas') previewCanvas?: ElementRef<HTMLCanvasElement>;
  @ViewChild('audioElement') audioElement?: ElementRef<HTMLAudioElement>;

  activeTab = signal<InputTab>('upload');

  showEditHint = signal<boolean>(false);
  isMobile = signal<boolean>(false);
  isDragging = signal<boolean>(false);
  isDraggingInvalid = signal<boolean>(false);

  // File Upload State
  uploadedFile = signal<File | null>(null);
  uploadUrl = signal<SafeUrl | null>(null);
  uploadedPeaks: number[] = [];

  // Recording State
  isRecording = signal<boolean>(false);
  recordingDuration = signal<number>(0);
  recordedFile = signal<File | null>(null);
  recordedUrl = signal<SafeUrl | null>(null);
  recordedPeaks: number[] = [];
  showPermissionGuide = signal<boolean>(false);
  micStillBlocked = signal<boolean>(false);

  permissionSteps = computed(() => {
    if (!this.isBrowser) return [];
    const ua = navigator.userAgent;
    const isAndroid = /Android/i.test(ua);
    const isIOS = /iPhone|iPad|iPod/i.test(ua);
    const isChrome = /Chrome/i.test(ua) && !/Edge|OPR|Firefox/i.test(ua);
    const isFirefox = /Firefox/i.test(ua);
    const isSafari = /Safari/i.test(ua) && !/Chrome|Firefox/i.test(ua);

    if (isAndroid && isChrome) {
      return [
        'Tap the <strong>lock icon</strong> 🔒 in the address bar',
        'Tap <strong>Permissions</strong> → <strong>Microphone</strong>',
        'Select <strong>Allow</strong>',
        'Tap <strong>Start Recording</strong> again'
      ];
    }
    if (!isIOS && isChrome) {
      return [
        'Click the <strong>lock icon</strong> 🔒 in the address bar (left of the URL)',
        'Find <strong>Microphone</strong> and change it to <strong>Allow</strong>',
        'Refresh the page and try again'
      ];
    }
    if (isFirefox) {
      return [
        'Click the <strong>lock icon</strong> 🔒 in the address bar',
        'Click the <strong>arrow</strong> next to <strong>Connection Secure</strong>',
        'Find <strong>Microphone</strong> → set to <strong>Allow</strong>',
        'Refresh the page and try again'
      ];
    }
    if (isIOS && isSafari) {
      return [
        'Open the <strong>Settings</strong> app on your device',
        'Scroll down and tap <strong>Safari</strong>',
        'Tap <strong>Microphone</strong> and set it to <strong>Allow</strong>',
        'Return to the browser and tap <strong>Start Recording</strong> again'
      ];
    }
    if (!isIOS && isSafari) {
      return [
        'Click <strong>Safari</strong> in the menu bar → <strong>Settings for This Website</strong>',
        'Find <strong>Microphone</strong> and set to <strong>Allow</strong>',
        'Refresh the page and try again'
      ];
    }
    return [
      'Open your browser <strong>Settings</strong>',
      'Find <strong>Site Permissions</strong> → <strong>Microphone</strong>',
      'Allow access for this site',
      'Refresh and try again'
    ];
  });

  private recordingInterval?: ReturnType<typeof setInterval>;
  private mediaRecorder?: MediaRecorder;
  private audioChunks: Blob[] = [];

  // Custom Audio Player State
  isPlaying = signal<boolean>(false);
  currentTime = signal<number>(0);
  duration = signal<number>(0);
  private playbackAnimationId?: number;

  currentAudioUrl = computed(() => {
    return this.activeTab() === 'upload' ? this.uploadUrl() : this.recordedUrl();
  });

  selectedFile = computed(() => {
    return this.activeTab() === 'upload' ? this.uploadedFile() : this.recordedFile();
  });

  fileInfo = computed(() => {
    const file = this.selectedFile();
    if (!file) return null;
    return {
      name: file.name,
      size: (file.size / (1024 * 1024)).toFixed(2) + ' MB',
      type: file.type
    };
  });

  // Waveform State
  private canvasInitialized = false;

  loadingTips = [
    'The human voice contains emotional signals that text alone cannot carry',
    'Tone of voice reveals emotion even when the words themselves are neutral',
    'Speed, pitch, and pauses are all strong emotional indicators in speech',
    'A person can say "I am fine" and sound angry, sad, or happy depending on delivery',
    'Audio emotion detection analyzes patterns across the full duration of the recording',
    'Background noise and recording quality affect how clearly emotions come through',
    'Emotions expressed through voice are harder to consciously control than written words',
    'The same speaker can shift emotional tone multiple times within a single sentence'
  ];

  tabOptions: SegmentedNavOption[] = [
    { label: 'Upload Audio', value: 'upload' },
    { label: 'Record Live', value: 'record' }
  ];

  // Results State
  showTextAnalysis = signal<boolean>(false);
  textDistributionData = signal<DistributionDataPoint[]>([]);

  modelChips = computed(() => {
    const res = this.result();
    if (!res) return [];
    return [
      { label: 'Audio Model', value: res.model_info.audio_model, mono: false },
      { label: 'Whisper', value: `v${res.model_info.whisper_model}`, mono: false },
      { label: 'Fusion Engine', value: res.model_info.fusion_version, mono: false },
      { label: 'Duration', value: `${res.audio_emotion.duration_seconds}s`, mono: false },
      { label: 'Processing', value: `${res.processing_time_ms}ms`, mono: true },
    ];
  });

  constructor() {
    super();

    // On tab switch: pause playback, redraw waveform without re-decoding
    effect(() => {
      const _tab = this.activeTab(); // track this signal

      untracked(() => {
        this.isPlaying.set(false);
        this.audioElement?.nativeElement?.pause();
      });

      const currentPeaks = _tab === 'upload' ? this.uploadedPeaks : this.recordedPeaks;
      if (currentPeaks.length > 0 && !this.result()) {
        setTimeout(() => {
          this.drawWaveform(true);
        }, 60);
      }
    });

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

  // Listen for resize to re-render waveform
  @HostListener('window:resize')
  onResize() {
    this.isMobile.set(window.innerWidth < 640);
    this.drawWaveform(true);
  }

  // ─── Base Hooks ───────────────────────────────────────────────────

  protected override onInit(): void {
    this.isMobile.set(window.innerWidth < 640);
    this.setupPermissionListener();
  }

  // ─── Base Abstract Implementations ────────────────────────────────

  protected findLocalSession(id: string): any | null {
    return this.storageService.getAudioSessionById(id)
      || this.storageService.getAudioSessions().find(s => s.cloudId === Number(id))
      || null;
  }

  protected applySession(session: any): void {
    this.sessionId.set(session.id);
    this.result.set(session.result);
    this.state.set('results');
  }

  protected saveLocalSession(session: any): void {
    this.storageService.saveAudioSession(session);
  }

  protected buildSessionPayload(sid: string, result: AudioAnalysisResponse): any {
    const file = this.selectedFile();
    return {
      id: sid,
      type: 'audio',
      timestamp: new Date().toISOString(),
      inputFileName: file?.name || 'Audio File',
      durationSeconds: result.audio_emotion.duration_seconds,
      result: result
    };
  }

  protected syncToCloud(sid: string, result: AudioAnalysisResponse): Observable<ApiResponse<number>> {
    const file = this.selectedFile();
    return this.analysisV2Service.saveAudioAnalysis(sid, result, file!);
  }

  ngOnDestroy() {
    this.stopRecording();
  }

  // ─── UPLOAD ───────────────────────────────────────────────────────────────

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    this.processFile(file);
  }

  onFileDrop(event: DragEvent) {
    event.preventDefault();
    this.isDragging.set(false);
    this.isDraggingInvalid.set(false);
    const file = event.dataTransfer?.files[0];
    this.processFile(file);
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
    this.isDragging.set(true);

    // Check if dragging items are supported
    const items = event.dataTransfer?.items;
    if (items && items.length > 0) {
      const item = items[0];
      if (item.kind === 'file') {
        const type = item.type;
        const acceptedTypes = ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/webm', 'audio/x-m4a', 'audio/mp3', 'audio/mp4'];

        // Some systems don't provide type during drag for all files
        // We consider it invalid if we HAVE a type and it's NOT in our list
        if (type && !acceptedTypes.includes(type)) {
          this.isDraggingInvalid.set(true);
        } else {
          this.isDraggingInvalid.set(false);
        }
      }
    }
  }

  onDragLeave() {
    this.isDragging.set(false);
    this.isDraggingInvalid.set(false);
  }

  private processFile(file?: File) {
    if (!file) return;

    if (file.size > 25 * 1024 * 1024) {
      this.error.set('File size exceeds 25MB limit.');
      return;
    }

    const acceptedTypes = ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/webm', 'audio/x-m4a'];
    if (!acceptedTypes.includes(file.type) && !file.name.endsWith('.m4a')) {
      this.error.set('Unsupported file format. Please use MP3, WAV, OGG, or M4A.');
      return;
    }

    this.error.set(null);
    this.uploadUrl.set(this.sanitizer.bypassSecurityTrustUrl(URL.createObjectURL(file)));
    this.uploadedFile.set(file);
    setTimeout(() => this.generateStaticWaveform(file, 'upload'), 80);
  }

  // ─── WAVEFORM ─────────────────────────────────────────────────────────────

  private async generateStaticWaveform(file: File, type: InputTab) {
    if (type === 'upload') this.uploadedPeaks = [];
    else this.recordedPeaks = [];
    this.canvasInitialized = false;

    try {
      const arrayBuffer = await file.arrayBuffer();
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // On mobile, AudioContext often starts in 'suspended' state and needs explicit resume
      if (audioCtx.state === 'suspended') {
        await audioCtx.resume();
      }

      const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
      audioCtx.close();

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

      if (type === 'upload') this.uploadedPeaks = peaks;
      else this.recordedPeaks = peaks;

      this.drawWaveform();
    } catch (err) {
      console.error('Waveform generation failed:', err);
    }
  }

  private drawWaveform(forceResize = false) {
    const currentPeaks = this.activeTab() === 'upload' ? this.uploadedPeaks : this.recordedPeaks;
    if (!this.previewCanvas || !currentPeaks.length) return;

    const canvas = this.previewCanvas.nativeElement;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0) return;

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
    const progressIndex = Math.floor(currentPeaks.length * progress);

    const barCount = currentPeaks.length;
    const spacing = width / barCount;
    const barWidth = Math.max(1, spacing * 0.7);

    currentPeaks.forEach((peak, i) => {
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

  // ─── RECORDING ────────────────────────────────────────────────────────────

  async startRecording() {
    this.error.set(null);

    try {
      this.audioChunks = [];
      this.recordedFile.set(null);
      this.recordedUrl.set(null);
      this.recordedPeaks = [];
      this.canvasInitialized = false;

      // Check for browser support
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('BROWSER_NOT_SUPPORTED');
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.mediaRecorder = new MediaRecorder(stream);

      this.mediaRecorder.ondataavailable = (ev) => {
        if (ev.data.size > 0) this.audioChunks.push(ev.data);
      };

      this.mediaRecorder.onstop = () => {
        const blob = new Blob(this.audioChunks, { type: 'audio/webm' });
        const objectUrl = URL.createObjectURL(blob);
        this.recordedUrl.set(this.sanitizer.bypassSecurityTrustUrl(objectUrl));

        const file = new File([blob], `recording_${Date.now()}.webm`, { type: 'audio/webm' });
        this.recordedFile.set(file);
        setTimeout(() => this.generateStaticWaveform(file, 'record'), 150);
      };

      this.isRecording.set(true);
      this.showPermissionGuide.set(false);
      this.micStillBlocked.set(false);
      this.mediaRecorder.start();
      this.startTimer();
    } catch (err: any) {
      console.error('Microphone access error:', err);

      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        const msg = 'Microphone access is blocked. Please allow it to continue.';
        this.error.set(msg);

        if (this.showPermissionGuide()) {
          this.micStillBlocked.set(true);
          setTimeout(() => this.micStillBlocked.set(false), 3000);
        }

        this.showPermissionGuide.set(true);
        this.toastService.show('Microphone Blocked', 'Please allow microphone access to start recording.', 'error', 'error');
      } else if (err.message === 'BROWSER_NOT_SUPPORTED') {
        this.error.set('Your browser does not support audio recording. Please try a modern browser like Chrome or Firefox.');
      } else {
        this.error.set('Could not access microphone. Please check your connection and permissions.');
        this.toastService.show('Hardware Error', 'Failed to initialize microphone.', 'error', 'error');
      }
    }
  }

  private setupPermissionListener() {
    if (this.isBrowser && navigator.permissions && (navigator.permissions as any).query) {
      try {
        navigator.permissions.query({ name: 'microphone' as any }).then(status => {
          status.onchange = () => {
            if (status.state === 'granted') {
              this.showPermissionGuide.set(false);
              this.error.set(null);
              this.micStillBlocked.set(false);
            }
          };
        });
      } catch (e) {
        // Some browsers don't support microphone query in Permissions API
        console.warn('Microphone permission query not supported');
      }
    }
  }

  stopRecording() {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
      this.mediaRecorder.stream.getTracks().forEach((t) => t.stop());
    }
    this.isRecording.set(false);
    this.stopTimer();
  }

  private startTimer() {
    this.recordingDuration.set(0);
    this.recordingInterval = setInterval(() => {
      this.recordingDuration.update((v) => v + 1);
    }, 1000);
  }

  private stopTimer() {
    if (this.recordingInterval) clearInterval(this.recordingInterval);
  }

  formatDuration(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  // ─── AUDIO PLAYER ─────────────────────────────────────────────────────────

  togglePlayback() {
    const audio = this.audioElement?.nativeElement;
    if (!audio) return;
    if (this.isPlaying()) {
      audio.pause();
    } else {
      audio.play();
    }
  }

  onAudioTimeUpdate() {
    const audio = this.audioElement?.nativeElement;
    if (audio) {
      this.currentTime.set(audio.currentTime);
      this.duration.set(audio.duration || 0);
      this.drawWaveform();
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

  // ─── ANALYSIS ─────────────────────────────────────────────────────────────

  startAnalysis() {
    const file = this.selectedFile();
    if (!file) return;
    this.executeAnalysisFlow(this.audioService.analyze(file));
  }

  protected override onAnalysisSuccess(sid: string, _result: AudioAnalysisResponse): void {
    // DEBUG: Temporary logs for checking the save flow request
    const file = this.selectedFile();
    console.log('--- Audio Save Debug ---');
    console.log('File:', file ? { name: file.name, size: file.size, type: file.type } : 'NULL');
    console.log('SID:', sid);
    console.log('Res Keys:', Object.keys(_result));
  }


  // ─── RESULTS ──────────────────────────────────────────────────────────────

  clearFile() {
    this.isPlaying.set(false);
    if (this.audioElement?.nativeElement) {
      this.audioElement.nativeElement.pause();
      this.audioElement.nativeElement.currentTime = 0;
    }

    if (this.activeTab() === 'upload') {
      this.uploadedFile.set(null);
      this.uploadUrl.set(null);
      this.uploadedPeaks = [];
    } else {
      this.recordedFile.set(null);
      this.recordedUrl.set(null);
      this.recordedPeaks = [];
    }
  }

  resetToInput() {
    this.isPlaying.set(false);
    if (this.audioElement?.nativeElement) {
      this.audioElement.nativeElement.pause();
    }
    this.state.set('input');
    this.result.set(null);
    this.showEditHint.set(false);
    this.uploadedFile.set(null);
    this.uploadUrl.set(null);
    this.uploadedPeaks = [];
    this.recordedFile.set(null);
    this.recordedPeaks = [];
    this.recordedUrl.set(null);
    this.error.set(null);
    this.router.navigate(['/analysis/audio']);
  }


  protected buildChartData(theme: any): void {
    const res = this.result();
    if (!res) return;

    // Timeline Data
    this.timelineData.set(res.audio_emotion.timeline.map((segment: any) => ({
      label: `${segment.timestamp_offset.toFixed(1)}s`,
      probabilities: segment.probabilities,
      tooltipTitle: `Timestamp: ${segment.timestamp_offset.toFixed(1)}s`
    })));

    // Final Distribution Data
    this.distributionData.set(res.final_multimodal_results.map(r => ({
      label: r.label,
      value: r.confidence * 100
    })));

    // Text Track Distribution Data
    this.textDistributionData.set(res.text_emotion.combined_results.map(r => ({
      label: r.label,
      value: r.confidence * 100
    })));
  }

  getMostFrequentDominant() {
    const res = this.result();
    if (!res) return 'Neutral';
    const counts: Record<string, number> = {};
    res.audio_emotion.timeline.forEach((s: AudioSegment) => {
      const label = s.dominant.label;
      counts[label] = (counts[label] || 0) + 1;
    });
    const winner = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
    return winner ? winner[0] : 'Neutral';
  }

}
