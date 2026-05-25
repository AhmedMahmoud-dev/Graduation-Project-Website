import { Component, signal, inject, computed, effect, OnInit, OnDestroy, ViewChild, ElementRef, untracked, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser, CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';

import { FaceAnalysis } from '../../../../core/models/image-analysis.model';
import { ImageAnalysisStore } from '../../../../core/stores/image-analysis.store';
import { AnalysisV2Service } from '../../../../core/services/analysis-v2.service';
import { ToastService } from '../../../../core/services/toast.service';
import { AnalysisStorageService } from '../../../../core/services/analysis-storage.service';

import { EmotionIconComponent } from '../../../../shared/components/emotion-icon/emotion-icon.component';
import { FooterSectionComponent } from '../../../../shared/components/footer/footer.component';
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

@Component({
  selector: 'app-image-analysis',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    EmotionIconComponent,
    FooterSectionComponent,
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
    AnalysisSectionHeaderComponent
  ],
  providers: [ImageAnalysisStore],
  templateUrl: './image-analysis.component.html',
  styleUrls: ['./image-analysis.component.css']
})
export class ImageAnalysisComponent implements OnInit, OnDestroy {
  readonly MAX_FILE_SIZE_MB = 10;
  private sanitizer = inject(DomSanitizer);
  private isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private toastService = inject(ToastService);
  private analysisV2Service = inject(AnalysisV2Service);
  private storageService = inject(AnalysisStorageService);
  store = inject(ImageAnalysisStore);

  // Expose store state / signals directly for the template
  state = this.store.state;
  error = this.store.error;
  result = this.store.result;
  sessionId = this.store.sessionId;
  distributionData = this.store.distributionData;
  modelChips = this.store.modelChips;
  selectedFaceId = this.store.selectedFaceId;
  activeEmotionData = this.store.activeEmotionData;
  colorService = this.store.colorService;
  emotionalInsights = this.store.emotionalInsights;

  @ViewChild('videoElement') videoElement?: ElementRef<HTMLVideoElement>;

  // Tab Options
  tabOptions: SegmentedNavOption[] = [
    { label: 'Upload Image', value: 'upload' },
    { label: 'Webcam Capture', value: 'capture' }
  ];

  activeTab = signal<'upload' | 'capture'>('upload');
  isDragging = signal<boolean>(false);
  isDraggingInvalid = signal<boolean>(false);

  // File Upload / Capture State
  uploadedFile = signal<File | null>(null);
  previewUrl = signal<SafeUrl | null>(null);
  imageLoading = signal<boolean>(true);



  // Webcam State
  isCapturing = signal<boolean>(false);
  cameraError = signal<string | null>(null);
  private stream: MediaStream | null = null;

  loadingTips = [
    'Facial expressions are processed using convolutional neural networks (CNNs)',
    'Our models scan coordinates for landmarks: eyes, eyebrows, nose, and mouth',
    'Micro-expressions can occur in as little as 1/25th of a second',
    'The 7 universal facial expressions of emotion: joy, sadness, anger, fear, surprise, disgust, and neutral',
    'Lighting conditions and camera angle can affect facial emotion detection accuracy',
    'Scene context analysis uses semantic modeling to infer overall mood and environment',
    'Face downscaling preserves aspect ratios while speed-optimizing neural network passes',
    'Looking directly at the camera with clear lighting gives the highest confidence scores'
  ];

  constructor() {
    // Watch for result / session loading to fetch historical image streams if needed
    effect(() => {
      const res = this.result();
      const stateVal = this.state();
      if (stateVal === 'results' && res) {
        untracked(() => {
          // If we don't have a local preview URL in memory, check our root storage cache or load it from backend
          if (!this.previewUrl()) {
            const sid = this.sessionId();
            const cachedBlob = this.storageService.getCachedImageBlob(sid);
            if (cachedBlob) {
              const objectUrl = URL.createObjectURL(cachedBlob);
              this.previewUrl.set(this.sanitizer.bypassSecurityTrustUrl(objectUrl));
              this.imageLoading.set(false);
            } else {
              this.imageLoading.set(true);
              const localSession = this.store['findLocalSession'](sid);
              const cloudId = localSession?.cloudId;
              if (cloudId) {
                this.fetchHistoricalImage(cloudId);
              }
            }
          } else {
            // Already have the previewUrl locally, so the image is ready immediately
            this.imageLoading.set(false);
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

  ngOnInit() {
    this.store.subscribeToRouteParams();
  }

  ngOnDestroy() {
    this.stopCamera();
  }

  // --- UPLOAD ---

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
        const acceptedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
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

    const acceptedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (!acceptedTypes.includes(file.type)) {
      const msg = 'Unsupported file format. Please use PNG, JPG, JPEG, or WEBP.';
      this.error.set(msg);
      this.toastService.show('Format Error', msg, 'error', 'error');
      return;
    }

    this.error.set(null);
    this.uploadedFile.set(file);
    const objectUrl = URL.createObjectURL(file);
    this.previewUrl.set(this.sanitizer.bypassSecurityTrustUrl(objectUrl));
  }

  // --- WEBCAM CAMERA ---

  async startCamera() {
    if (!this.isBrowser) return;
    this.cameraError.set(null);
    // Clear preview url and uploaded file so the capture workspace is rendered
    this.previewUrl.set(null);
    this.uploadedFile.set(null);
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720, facingMode: 'user' }
      });
      this.isCapturing.set(true);
      // Wait for Angular to render the video element
      setTimeout(() => {
        if (this.videoElement) {
          this.videoElement.nativeElement.srcObject = this.stream;
          this.videoElement.nativeElement.play().catch(playErr => {
            console.error('Error playing webcam video stream:', playErr);
          });
        } else {
          console.error('Webcam video element was not found after rendering tick.');
        }
      }, 50);
    } catch (err) {
      console.error('Error starting camera:', err);
      this.cameraError.set('Could not access webcam. Please verify site permissions.');
      this.toastService.show('Camera Error', 'Could not access webcam.', 'error', 'error');
    }
  }

  stopCamera() {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    this.isCapturing.set(false);
  }

  capturePhoto() {
    if (!this.videoElement) return;
    const video = this.videoElement.nativeElement;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      // Flip canvas to match mirrored camera preview
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      // Restore transforms
      ctx.setTransform(1, 0, 0, 1, 0, 0);

      canvas.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], `capture_${Date.now()}.jpg`, { type: 'image/jpeg' });
          this.uploadedFile.set(file);
          const objectUrl = URL.createObjectURL(file);
          this.previewUrl.set(this.sanitizer.bypassSecurityTrustUrl(objectUrl));
          this.stopCamera();
        }
      }, 'image/jpeg', 0.95);
    }
  }

  // --- ANALYSIS ---

  startAnalysis() {
    const file = this.uploadedFile();
    if (file) {
      this.imageLoading.set(true);
      this.store.startAnalysis(file);
    }
  }

  clearFile() {
    this.uploadedFile.set(null);
    this.previewUrl.set(null);
    this.stopCamera();
    this.error.set(null);
  }

  resetToInput() {
    this.store.resetToInput();
    this.clearFile();
    this.imageLoading.set(true);
  }

  // --- HISTORICAL LOADER ---

  private fetchHistoricalImage(cloudId: number | string) {
    this.analysisV2Service.getMediaStream(cloudId).subscribe({
      next: (blob) => {
        const objectUrl = URL.createObjectURL(blob);
        this.previewUrl.set(this.sanitizer.bypassSecurityTrustUrl(objectUrl));
      },
      error: (err) => {
        console.error('Failed to fetch historical image:', err);
      }
    });
  }

  // --- BOUNDING BOX AND SELECTION ---

  getFaceStyle(face: FaceAnalysis) {
    const res = this.result();
    if (!res) return {};
    const baseW = res.frame_quality.was_downscaled ? res.frame_quality.downscaled_to[0] : res.frame_quality.original_width;
    const baseH = res.frame_quality.was_downscaled ? res.frame_quality.downscaled_to[1] : res.frame_quality.original_height;
    
    // coord calculations
    const [xMin, yMin, xMax, yMax] = face.bbox;
    const left = (xMin / baseW) * 100;
    const top = (yMin / baseH) * 100;
    const width = ((xMax - xMin) / baseW) * 100;
    const height = ((yMax - yMin) / baseH) * 100;
    
    const isSelected = this.selectedFaceId() === face.face_id;
    const color = this.colorService.getColor(face.combined_final_emotion.label);
    
    return {
      left: `${left}%`,
      top: `${top}%`,
      width: `${width}%`,
      height: `${height}%`,
      '--face-color': color,
      'border-color': color,
      'box-shadow': isSelected ? `0 0 20px ${color}` : '0 0 10px rgba(0,0,0,0.3)'
    };
  }

  selectFace(faceId: number | null) {
    this.store.selectFace(faceId);
  }

  scrollToFeedback(): void {
    const el = document.getElementById('feedback-section');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }
}
