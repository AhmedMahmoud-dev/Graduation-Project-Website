import { Component, signal, inject, computed, effect, OnInit, OnDestroy, ViewChild, ElementRef, untracked, HostListener, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser, CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';

import { ThemeService } from '../../../../core/services/theme.service';
import { VideoAnalysisResponse, FaceVideoAnalysis } from '../../../../core/models/video-analysis.model';
import { EmotionIconComponent } from '../../../../shared/components/emotion-icon/emotion-icon.component';
import { FooterSectionComponent } from '../../../../shared/components/footer/footer.component';
import { EmotionTimelineComponent } from '../../../../shared/components/emotion-charts/emotion-timeline/emotion-timeline.component';
import { EmotionDistributionComponent } from '../../../../shared/components/emotion-charts/emotion-distribution/emotion-distribution.component';
import { DominantEmotionHeroComponent } from '../../../../shared/components/analysis/dominant-emotion-hero/dominant-emotion-hero.component';
import { SessionTopBarComponent } from '../../../../shared/components/analysis/session-top-bar/session-top-bar.component';
import { RawJsonSectionComponent } from '../../../../shared/components/analysis/raw-json-section/raw-json-section.component';
import { ModelInfoGridComponent } from '../../../../shared/components/analysis/model-info-grid/model-info-grid.component';
import { LoadingTipsComponent } from '../../../../shared/components/analysis/loading-tips/loading-tips.component';
import { LoadingStateComponent } from '../../../../shared/components/loading-state/loading-state.component';
import { PageHeaderComponent } from '../../../../shared/components/layout/page-header/page-header.component';
import { AnalysisFeedbackComponent } from '../../../../shared/components/analysis-feedback/analysis-feedback.component';
import { SegmentedNavComponent, SegmentedNavOption } from '../../../../shared/components/segmented-nav/segmented-nav.component';
import { AnalysisSectionHeaderComponent } from '../../../../shared/components/analysis-section-header/analysis-section-header.component';
import { VideoPlayerComponent } from '../../../../shared/components/video-player/video-player.component';

import { VideoAnalysisStore } from '../../../../core/stores/video-analysis.store';
import { ToastService } from '../../../../core/services/toast.service';
import { AnalysisStorageService } from '../../../../core/services/analysis-storage.service';
import { AnalysisV2Service } from '../../../../core/services/analysis-v2.service';
import { QuotaStore } from '../../../../core/stores/quota.store';
import { QuotaBannerComponent } from "../../../../shared/components/quota-banner/quota-banner.component";

@Component({
  selector: 'app-video-analysis',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    EmotionIconComponent,
    FooterSectionComponent,
    EmotionTimelineComponent,
    EmotionDistributionComponent,
    DominantEmotionHeroComponent,
    SessionTopBarComponent,
    RawJsonSectionComponent,
    ModelInfoGridComponent,
    LoadingTipsComponent,
    LoadingStateComponent,
    PageHeaderComponent,
    AnalysisFeedbackComponent,
    SegmentedNavComponent,
    AnalysisSectionHeaderComponent,
    VideoPlayerComponent,
    QuotaBannerComponent
],
  providers: [VideoAnalysisStore],
  templateUrl: './video-analysis.component.html',
  styleUrls: ['./video-analysis.component.css']
})
export class VideoAnalysisComponent implements OnInit, OnDestroy {
  readonly MAX_FILE_SIZE_MB = 50;
  private sanitizer = inject(DomSanitizer);
  private themeService = inject(ThemeService);
  private isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private toastService = inject(ToastService);
  private analysisV2Service = inject(AnalysisV2Service);
  private storageService = inject(AnalysisStorageService);
  store = inject(VideoAnalysisStore);
  private quotaStore = inject(QuotaStore);

  isBlocked = computed(() => this.quotaStore.video()?.is_blocked ?? false);

  // Delegated to Store
  state = this.store.state;
  error = this.store.error;
  result = this.store.result;
  sessionId = this.store.sessionId;
  timelineData = this.store.timelineData;
  distributionData = this.store.distributionData;
  modelChips = this.store.modelChips;
  selectedFaceId = this.store.selectedFaceId;
  activeEmotionData = this.store.activeEmotionData;
  colorService = this.store.colorService;
  emotionalInsights = this.store.emotionalInsights;
  showBrowseOption = this.store.showBrowseOption;
  userChoseToBrowse = this.store.userChoseToBrowse;

  @ViewChild('videoElement') videoElement?: ElementRef<HTMLVideoElement>;
  @ViewChild('recordingVideoElement') recordingVideoElement?: ElementRef<HTMLVideoElement>;

  // Tab Options
  tabOptions: SegmentedNavOption[] = [
    { label: 'Upload Video', value: 'upload' },
    { label: 'Record Video', value: 'record' }
  ];

  activeTab = signal<'upload' | 'record'>('upload');
  isDragging = signal<boolean>(false);
  isDraggingInvalid = signal<boolean>(false);
  videoLoading = signal<boolean>(true);

  // File Upload State
  uploadedFile = signal<File | null>(null);
  uploadUrl = signal<SafeUrl | null>(null);

  // Recording State
  isRecording = signal<boolean>(false);
  recordingDuration = signal<number>(0);
  recordedFile = signal<File | null>(null);
  recordUrl = signal<SafeUrl | null>(null);

  previewUrl = computed(() => this.activeTab() === 'upload' ? this.uploadUrl() : this.recordUrl());
  showPermissionGuide = signal<boolean>(false);
  micCameraBlocked = signal<boolean>(false);

  recordedBytes = signal<number>(0);
  recordedSizeMB = computed(() => this.recordedBytes() / (1024 * 1024));
  isNearSizeLimit = computed(() => this.recordedSizeMB() >= 45.0);

  private recordingInterval?: ReturnType<typeof setInterval>;
  private mediaRecorder?: MediaRecorder;
  private videoChunks: Blob[] = [];
  private stream: MediaStream | null = null;
  private isRecordingCancelled = false;

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
        'Tap <strong>Permissions</strong> → Allow <strong>Camera</strong> & <strong>Microphone</strong>',
        'Tap <strong>Start Recording</strong> again'
      ];
    }
    if (!isIOS && isChrome) {
      return [
        'Click the <strong>lock icon</strong> 🔒 left of the address bar',
        'Ensure <strong>Camera</strong> and <strong>Microphone</strong> are set to <strong>Allow</strong>',
        'Refresh the page and try again'
      ];
    }
    if (isFirefox) {
      return [
        'Click the <strong>lock icon</strong> 🔒 in the address bar',
        'Select <strong>Allowed</strong> for Camera and Microphone permissions',
        'Refresh the page and try again'
      ];
    }
    if (isIOS && isSafari) {
      return [
        'Open <strong>Settings</strong> → <strong>Safari</strong> on your device',
        'Ensure <strong>Camera & Microphone</strong> access are set to <strong>Allow</strong>',
        'Return here and try again'
      ];
    }
    return [
      'Open browser <strong>Settings</strong>',
      'Go to <strong>Site Permissions</strong>',
      'Allow access to <strong>Camera & Microphone</strong>',
      'Refresh and try again'
    ];
  });

  loadingTips = [
    'Video emotion mapping processes facial expressions at multiple frames per second to track expression changes over time.',
    'Temporal emotion analysis models the rise, peak, and decay of emotional intensity throughout the video timeline.',
    'Our face tracker maintains unique IDs across frames, allowing you to select and trace specific individuals in a group.',
    'The scene context model evaluates environmental factors and background cues to estimate the overall atmosphere.',
    'Micro-expressions occur in fractions of a second — frame-by-frame analysis helps capture these subtle transitions.',
    'Optical flow checks motion changes between frames to distinguish true expressions from rapid facial movements.',
    'For optimal results, ensure clear lighting and that the subject\'s face is fully visible to the camera.',
    'Multimodal fusion combines spatial face data with scene coordinates for a complete emotional output.'
  ];

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

  constructor() {
    // Switch tabs callback: stop recording, clear errors
    effect(() => {
      const _tab = this.activeTab();
      untracked(() => {
        this.stopRecording();
        this.stopCameraStream();
        this.error.set(null);
      });
    });

    // Watch for result / session loading to fetch historical media streams if needed
    effect(() => {
      const res = this.result();
      const stateVal = this.state();
      if (stateVal === 'results' && res) {
        untracked(() => {
          if (!this.previewUrl()) {
            const sid = this.sessionId();
            const cachedBlob = this.storageService.getCachedVideoBlob(sid);
            if (cachedBlob) {
              const objectUrl = URL.createObjectURL(cachedBlob);
              const safeUrl = this.sanitizer.bypassSecurityTrustUrl(objectUrl);
              this.uploadUrl.set(safeUrl);
              this.recordUrl.set(safeUrl);
              this.videoLoading.set(false);
            } else {
              this.videoLoading.set(true);
              const localSession = this.store['findLocalSession'](sid);
              const cloudId = localSession?.cloudId;
              if (cloudId) {
                this.fetchHistoricalVideo(cloudId);
              }
            }
          } else {
            this.videoLoading.set(false);
          }
        });
      }
    });

    // Scroll to feedback listener
    effect(() => {
      if (this.store.shouldScrollToFeedback()) {
        untracked(() => {
          this.store.shouldScrollToFeedback.set(false);
        });
        setTimeout(() => this.scrollToFeedback(), 150);
      }
    });
  }

  ngOnInit() {
    this.store.subscribeToRouteParams();
    this.setupPermissionListener();
  }

  ngOnDestroy() {
    this.stopRecording();
    this.stopCameraStream();
  }

  // ─── UPLOAD TAB ────────────────────────────────────────────────────────────

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

    const items = event.dataTransfer?.items;
    if (items && items.length > 0) {
      const item = items[0];
      if (item.kind === 'file') {
        const type = item.type;
        const acceptedTypes = ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime'];
        const name = item.type ? '' : (item as any).name || '';
        const isMov = name.endsWith('.mov') || type === 'video/quicktime';

        if (type && !acceptedTypes.includes(type) && !isMov) {
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

    const acceptedTypes = ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime'];
    const isMov = file.name.endsWith('.mov') || file.type === 'video/quicktime';
    if (!acceptedTypes.includes(file.type) && !isMov) {
      const msg = 'Unsupported file format. Please use MP4, WEBM, OGG, or MOV.';
      this.error.set(msg);
      this.toastService.show('Format Error', msg, 'error', 'error');
      return;
    }

    this.error.set(null);
    this.uploadedFile.set(file);
    const objectUrl = URL.createObjectURL(file);
    this.uploadUrl.set(this.sanitizer.bypassSecurityTrustUrl(objectUrl));
  }

  async startRecording() {
    this.error.set(null);
    this.isRecordingCancelled = false;
    this.recordedBytes.set(0);
    try {
      this.videoChunks = [];
      this.recordedFile.set(null);
      this.recordUrl.set(null);

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('BROWSER_NOT_SUPPORTED');
      }

      this.stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720, facingMode: 'user' },
        audio: true
      });

      // Display live feedback in stream element
      setTimeout(() => {
        if (this.recordingVideoElement) {
          this.recordingVideoElement.nativeElement.srcObject = this.stream;
          this.recordingVideoElement.nativeElement.muted = true; // prevent audio loopback echo
          this.recordingVideoElement.nativeElement.play().catch(e => console.error('Play stream error:', e));
        }
      }, 50);

      this.mediaRecorder = new MediaRecorder(this.stream, { mimeType: 'video/webm' });
      this.mediaRecorder.ondataavailable = (ev) => {
        if (ev.data.size > 0) {
          this.videoChunks.push(ev.data);
          this.recordedBytes.update(size => {
            const nextSize = size + ev.data.size;
            if (nextSize >= 50 * 1024 * 1024) {
              setTimeout(() => this.stopRecording(), 10);
            }
            return nextSize;
          });
        }
      };

      this.mediaRecorder.onstop = () => {
        if (this.isRecordingCancelled) {
          this.videoChunks = [];
          return;
        }
        const blob = new Blob(this.videoChunks, { type: 'video/webm' });
        const objectUrl = URL.createObjectURL(blob);
        this.recordUrl.set(this.sanitizer.bypassSecurityTrustUrl(objectUrl));

        const file = new File([blob], `webcam_record_${Date.now()}.webm`, { 
          type: 'video/webm',
          lastModified: Date.now()
        });
        this.recordedFile.set(file);
      };

      this.isRecording.set(true);
      this.showPermissionGuide.set(false);
      this.micCameraBlocked.set(false);
      this.mediaRecorder.start(1000); // Trigger dataavailable every 1 second
      this.startTimer();
    } catch (err: any) {
      console.error('Camera/Mic permission error:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        const msg = 'Camera and Microphone access are blocked. Check permission settings.';
        this.error.set(msg);
        this.showPermissionGuide.set(true);
        this.toastService.show('Permissions Blocked', 'Please grant microphone and camera access to record.', 'error', 'error');
      } else if (err.message === 'BROWSER_NOT_SUPPORTED') {
        this.error.set('Recording is unsupported in your browser. Try a modern browser like Chrome or Firefox.');
      } else {
        this.error.set('Failed to initialize webcam. Verify your camera is connected and not in use.');
        this.toastService.show('Hardware Error', 'Could not open camera.', 'error', 'error');
      }
    }
  }

  stopRecording() {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }
    this.stopCameraStream();
    this.isRecording.set(false);
    this.stopTimer();
  }

  cancelRecording() {
    this.isRecordingCancelled = true;
    this.stopRecording();
    this.clearFile();
  }

  private stopCameraStream() {
    if (this.stream) {
      this.stream.getTracks().forEach(t => t.stop());
      this.stream = null;
    }
    if (this.recordingVideoElement) {
      this.recordingVideoElement.nativeElement.srcObject = null;
    }
  }

  private setupPermissionListener() {
    if (this.isBrowser && navigator.permissions && (navigator.permissions as any).query) {
      try {
        navigator.permissions.query({ name: 'camera' as any }).then(cameraStatus => {
          cameraStatus.onchange = () => {
            if (cameraStatus.state === 'granted') {
              this.showPermissionGuide.set(false);
              this.error.set(null);
            }
          };
        });
      } catch (e) {
        console.warn('Permissions query unsupported');
      }
    }
  }

  private startTimer() {
    this.recordingDuration.set(0);
    this.recordingInterval = setInterval(() => {
      this.recordingDuration.update(v => v + 1);
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

  // ─── UTILITIES & ACTIONS ───────────────────────────────────────────────────

  startAnalysis() {
    const file = this.selectedFile();
    if (file) {
      this.videoLoading.set(true);
      this.store.startAnalysis(file);
    }
  }

  clearFile() {
    this.stopRecording();
    if (this.activeTab() === 'upload') {
      this.uploadedFile.set(null);
      this.uploadUrl.set(null);
    } else {
      this.recordedFile.set(null);
      this.recordUrl.set(null);
      this.recordingDuration.set(0);
    }
    this.error.set(null);
  }

  resetToInput() {
    this.store.resetToInput();
    this.uploadedFile.set(null);
    this.uploadUrl.set(null);
    this.recordedFile.set(null);
    this.recordUrl.set(null);
    this.recordingDuration.set(0);
    this.stopRecording();
    this.error.set(null);
    this.videoLoading.set(true);
  }

  continueBrowsing() {
    this.store.continueBrowsing();
  }

  selectFace(faceId: number | null) {
    this.store.selectFace(faceId);
  }

  private fetchHistoricalVideo(cloudId: number | string) {
    this.analysisV2Service.getMediaStream(cloudId).subscribe({
      next: (blob) => {
        const objectUrl = URL.createObjectURL(blob);
        const safeUrl = this.sanitizer.bypassSecurityTrustUrl(objectUrl);
        this.uploadUrl.set(safeUrl);
        this.recordUrl.set(safeUrl);
        this.videoLoading.set(false);
      },
      error: (err) => {
        console.error('Failed to retrieve video stream:', err);
        this.videoLoading.set(false);
      }
    });
  }

  scrollToFeedback(): void {
    const el = document.getElementById('feedback-section');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }
}
