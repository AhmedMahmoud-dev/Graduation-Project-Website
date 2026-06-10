import { Component, signal, inject, computed, effect, OnInit, OnDestroy, ViewChild, ElementRef, untracked, HostListener, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { ThemeService } from '../../../../core/services/theme.service';
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
import { AudioPlayerComponent } from '../../../../shared/components/audio-player/audio-player.component';
import { AnalysisFeedbackComponent } from '../../../../shared/components/analysis-feedback/analysis-feedback.component';
import { SegmentedNavComponent, SegmentedNavOption } from '../../../../shared/components/segmented-nav/segmented-nav.component';
import { AnalysisSectionHeaderComponent } from '../../../../shared/components/analysis-section-header/analysis-section-header.component';
import { AudioAnalysisStore } from '../../../../core/stores/audio-analysis.store';
import { ToastService } from '../../../../core/services/toast.service';
import { QuotaStore } from '../../../../core/stores/quota.store';
import { QuotaBannerComponent } from '../../../../shared/components/quota-banner/quota-banner.component';
import { AnalysisV2Service } from '../../../../core/services/analysis-v2.service';
import { AnalysisStorageService } from '../../../../core/services/analysis-storage.service';

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
    AnalysisSectionHeaderComponent,
    QuotaBannerComponent,
    AudioPlayerComponent
  ],
  providers: [AudioAnalysisStore],
  templateUrl: './audio-analysis.component.html',
  styleUrls: ['./audio-analysis.component.css']
})
export class AudioAnalysisComponent implements OnInit, OnDestroy {
  readonly MAX_FILE_SIZE_MB = 25;
  private sanitizer = inject(DomSanitizer);
  private themeService = inject(ThemeService);
  private isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private toastService = inject(ToastService);
  private store = inject(AudioAnalysisStore);
  private quotaStore = inject(QuotaStore);
  private analysisV2Service = inject(AnalysisV2Service);
  private storageService = inject(AnalysisStorageService);

  isBlocked = computed(() => this.quotaStore.audio()?.is_blocked ?? false);
  audioLoading = signal<boolean>(false);

  // Delegated to Store
  state = this.store.state;
  error = this.store.error;
  result = this.store.result;
  sessionId = this.store.sessionId;
  timelineData = this.store.timelineData;
  distributionData = this.store.distributionData;
  textDistributionData = this.store.textDistributionData;
  modelChips = this.store.modelChips;
  colorService = this.store.colorService;
  showBrowseOption = this.store.showBrowseOption;
  userChoseToBrowse = this.store.userChoseToBrowse;

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

  currentAudioUrl = computed(() => {
    return this.activeTab() === 'upload' ? this.uploadUrl() : this.recordedUrl();
  });

  selectedFile = computed(() => {
    return this.activeTab() === 'upload' ? this.uploadedFile() : this.recordedFile();
  });

  audioFilename = computed(() => {
    const file = this.selectedFile();
    if (file) return file.name;
    const res = this.result();
    if (res) {
      const sid = this.sessionId();
      const localSession = this.getLocalSession(sid);
      if (localSession?.inputFileName) {
        return localSession.inputFileName;
      }
    }
    return 'Audio Recording';
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

  constructor() {
    // On tab switch: clear error
    effect(() => {
      const _tab = this.activeTab(); // track this signal
      untracked(() => {
        this.error.set(null);
      });
    });

    // Watch for result / session loading to fetch historical media streams if needed
    effect(() => {
      const res = this.result();
      const stateVal = this.state();
      if (stateVal === 'results' && res) {
        untracked(() => {
          if (!this.currentAudioUrl()) {
            const sid = this.sessionId();
            const cachedBlob = this.storageService.getCachedAudioBlob(sid);
            if (cachedBlob) {
              const objectUrl = URL.createObjectURL(cachedBlob);
              const safeUrl = this.sanitizer.bypassSecurityTrustUrl(objectUrl);
              const filename = this.audioFilename();
              const file = new File([cachedBlob], filename, { type: cachedBlob.type });
              this.uploadedFile.set(file);
              this.uploadUrl.set(safeUrl);
              this.recordedFile.set(file);
              this.recordedUrl.set(safeUrl);
              this.audioLoading.set(false);
            } else {
              this.audioLoading.set(true);
              const localSession = this.getLocalSession(sid);
              const cloudId = localSession?.cloudId;
              if (cloudId) {
                this.fetchHistoricalAudio(cloudId);
              } else {
                this.audioLoading.set(false);
              }
            }
          } else {
            this.audioLoading.set(false);
          }
        });
      }
    });

    // Reactive scroll-to-feedback handling
    effect(() => {
      if (this.store.shouldScrollToFeedback()) {
        untracked(() => {
          this.store.shouldScrollToFeedback.set(false);
        });
        setTimeout(() => this.scrollToFeedback(), 150);
      }
    });
  }

  // Listen for resize to update state
  @HostListener('window:resize')
  onResize() {
    this.isMobile.set(window.innerWidth < 640);
  }

  ngOnInit() {
    this.isMobile.set(window.innerWidth < 640);
    this.setupPermissionListener();
    this.store.subscribeToRouteParams();
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
        const acceptedTypes = [
          'audio/mpeg',
          'audio/mp3',
          'audio/wav',
          'audio/ogg',
          'audio/webm',
          'audio/x-m4a',
          'audio/m4a',
          'audio/mp4'
        ];

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

    if (file.size > this.MAX_FILE_SIZE_MB * 1024 * 1024) {
      const msg = `File size exceeds ${this.MAX_FILE_SIZE_MB}MB limit.`;
      this.error.set(msg);
      this.toastService.show('File Too Large', msg, 'error', 'error');
      return;
    }

    const acceptedTypes = [
      'audio/mpeg',
      'audio/mp3',
      'audio/wav',
      'audio/ogg',
      'audio/webm',
      'audio/x-m4a',
      'audio/m4a',
      'audio/mp4'
    ];
    const extension = file.name.split('.').pop()?.toLowerCase();
    const allowedExtensions = ['mp3', 'wav', 'ogg', 'm4a', 'webm'];

    if (!acceptedTypes.includes(file.type) && !allowedExtensions.includes(extension || '')) {
      const msg = 'Unsupported file format. Please use MP3, WAV, OGG, M4A, or WEBM.';
      this.error.set(msg);
      this.toastService.show('Format Error', msg, 'error', 'error');
      return;
    }

    this.error.set(null);
    this.uploadUrl.set(this.sanitizer.bypassSecurityTrustUrl(URL.createObjectURL(file)));
    this.uploadedFile.set(file);
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



  // ─── ANALYSIS ─────────────────────────────────────────────────────────────

  startAnalysis() {
    const file = this.selectedFile();
    if (file) {
      this.store.startAnalysis(file);
    }
  }

  continueBrowsing() {
    this.store.continueBrowsing();
  }

  // ─── RESULTS ──────────────────────────────────────────────────────────────

  clearFile() {
    if (this.activeTab() === 'upload') {
      this.uploadedFile.set(null);
      this.uploadUrl.set(null);
      this.uploadedPeaks = [];
    } else {
      this.recordedFile.set(null);
      this.recordedUrl.set(null);
      this.recordedPeaks = [];
      this.recordingDuration.set(0);
    }
  }

  resetToInput() {
    this.store.resetToInput();
    this.showEditHint.set(false);
    this.uploadedFile.set(null);
    this.uploadUrl.set(null);
    this.uploadedPeaks = [];
    this.recordedFile.set(null);
    this.recordedPeaks = [];
    this.recordedUrl.set(null);
    this.recordingDuration.set(0);
    this.audioLoading.set(false);
  }

  private getLocalSession(sid: string) {
    return this.storageService.getAudioSessionById(sid)
      || this.storageService.getAudioSessions().find(s => s.cloudId === Number(sid))
      || null;
  }

  private fetchHistoricalAudio(cloudId: number | string) {
    this.analysisV2Service.getMediaStream(cloudId).subscribe({
      next: (blob) => {
        const objectUrl = URL.createObjectURL(blob);
        const safeUrl = this.sanitizer.bypassSecurityTrustUrl(objectUrl);
        const filename = this.audioFilename();
        const file = new File([blob], filename, { type: blob.type });
        this.uploadedFile.set(file);
        this.uploadUrl.set(safeUrl);
        this.recordedFile.set(file);
        this.recordedUrl.set(safeUrl);
        this.audioLoading.set(false);
        const sid = this.sessionId();
        if (sid) {
          this.storageService.cacheAudioBlob(sid, blob);
        }
      },
      error: (err) => {
        console.error('Failed to retrieve audio stream:', err);
        this.audioLoading.set(false);
      }
    });
  }

  getMostFrequentDominant() {
    return this.store.getMostFrequentDominant();
  }

  scrollToFeedback(): void {
    const el = document.getElementById('feedback-section');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

}
