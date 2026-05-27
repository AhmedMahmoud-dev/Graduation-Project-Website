import { Injectable, inject, signal, computed, effect, untracked } from '@angular/core';
import { Observable, map } from 'rxjs';

import { BaseAnalysisStore } from './base-analysis.store';
import { VideoAnalysisResponse, VideoAnalysisSession } from '../models/video-analysis.model';
import { VideoAnalysisService } from '../services/video-analysis.service';
import { AnalysisStorageService } from '../services/analysis-storage.service';
import { AnalysisV2Service } from '../services/analysis-v2.service';
import { AnalysisBgService } from '../services/analysis-bg.service';
import { ApiResponse } from '../models/api-response.model';
import { DistributionDataPoint } from '../models/chart-data.model';

@Injectable()
export class VideoAnalysisStore extends BaseAnalysisStore<VideoAnalysisResponse, VideoAnalysisSession> {
  private videoService = inject(VideoAnalysisService);
  private storageService = inject(AnalysisStorageService);
  private analysisV2Service = inject(AnalysisV2Service);
  private analysisBgService = inject(AnalysisBgService);

  // ─── Base Config Hooks ────────────────────────────────────────────
  protected override readonly analysisType = 'video' as const;
  protected override readonly analysisRoute = '/analysis/video';
  protected override readonly expectedApiType = 'Video';

  // ─── Video-Specific State ──────────────────────────────────────────
  selectedFile = signal<File | null>(null);
  selectedFaceId = signal<number | null>(null); // null means Scene Context
  showBrowseOption = signal<boolean>(false);
  userChoseToBrowse = signal<boolean>(false);

  // ─── Computed Signals ─────────────────────────────────────────────
  modelChips = computed(() => {
    const res = this.result();
    if (!res) return [];
    return [
      { label: 'Detector', value: res.model_info.detector, mono: false },
      { label: 'Emotion Model', value: res.model_info.emotion_model, mono: false },
      { label: 'Tracker', value: res.model_info.tracker, mono: false },
      { label: 'Sampled Frames', value: `${res.sampled_frames}/${res.total_frames}`, mono: false },
      { label: 'Processing Time', value: `${res.processing_time_ms}ms`, mono: true },
    ];
  });

  activeEmotionData = computed(() => {
    const res = this.result();
    if (!res) return null;

    const faceId = this.selectedFaceId();
    if (faceId !== null) {
      const face = res.faces.find(f => f.face_id === faceId);
      if (face) {
        return {
          label: face.combined_final_emotion.label,
          confidence_percent: face.combined_final_emotion.confidence_percent,
          category: face.combined_final_emotion.category,
          probabilities: face.combined_results
        };
      }
    }

    // Default to Scene Context
    return {
      label: res.scene_emotion.label,
      confidence_percent: res.scene_emotion.confidence_percent,
      category: res.scene_emotion.category,
      probabilities: [
        {
          label: res.scene_emotion.label,
          confidence: res.scene_emotion.confidence,
          confidence_percent: res.scene_emotion.confidence_percent
        }
      ]
    };
  });

  emotionalInsights = computed(() => {
    const active = this.activeEmotionData();
    if (!active) return null;

    const primary = active.label;
    const category = active.category;
    let polarity = 'Neutral';
    let polarityColor = '#778ca3';

    if (category === 'positive') {
      polarity = 'Positive';
      polarityColor = '#ffd32a';
    } else if (category === 'negative') {
      polarity = 'Negative';
      polarityColor = '#ff4757';
    }

    return {
      primary,
      polarity,
      polarityColor,
      complexity: 'Dynamic Temporal'
    };
  });

  constructor() {
    super();

    // Background Job Results Effect
    effect(() => {
      const jobResult = this.analysisBgService.jobResult();
      if (jobResult && this.state() === 'loading' && !this.userChoseToBrowse()) {
         untracked(() => {
            const sid = jobResult.id;
            const res = jobResult.result as VideoAnalysisResponse;
            this.result.set(this.normalizeVideoResult(res));
            this.sessionId.set(sid);
            this.buildChartData(this.chartThemeService.getChartTheme());
            this.state.set('results');
            if (this.router) {
              this.router.navigate([this.analysisRoute, sid], { replaceUrl: true });
            }
         });
      }
    });

    // Background Job Error Effect
    effect(() => {
      const jobError = this.analysisBgService.jobError();
      if (jobError && this.state() === 'loading' && !this.userChoseToBrowse()) {
         untracked(() => {
              this.error.set('Something went wrong. Please try again later.');
              this.state.set('input');
         });
      }
    });
  }

  // ─── Base Store Hook Implementations ──────────────────────────────

  protected override findLocalSession(id: string): VideoAnalysisSession | null {
    return this.storageService.getVideoSessionById(id)
      || this.storageService.getVideoSessions().find(s => s.cloudId === Number(id))
      || null;
  }

  private sanitizeRawResult(res: VideoAnalysisResponse): VideoAnalysisResponse {
    let finalDuration = res.duration_seconds || 0;
    let finalFrames = res.total_frames || 0;

    // If OpenCV failed to read headers and returned <= 0 (e.g. INT64_MIN), reconstruct from timeline
    if (finalDuration <= 0 || finalFrames <= 0) {
      let maxFrame = 0;
      let maxSec = 0;
      (res.faces || []).forEach(face => {
        (face.timeline || []).forEach(t => {
          if (t.frame_index > maxFrame) maxFrame = t.frame_index;
          if (t.timestamp_sec > maxSec) maxSec = t.timestamp_sec;
        });
      });

      if (maxFrame > 0 && finalFrames <= 0) finalFrames = maxFrame;
      if (maxSec > 0 && finalDuration <= 0) finalDuration = maxSec;

      // Provide a tiny absolute fallback to guarantee C# backend validation passes
      if (finalFrames <= 0) finalFrames = 1;
      if (finalDuration <= 0) finalDuration = 0.1;

      return {
        ...res,
        duration_seconds: finalDuration,
        total_frames: finalFrames
      };
    }
    return res;
  }

  private normalizeVideoResult(res: VideoAnalysisResponse): VideoAnalysisResponse {
    if (!res) return res;

    const mapLabel = (label: string): string => {
      const lower = label.toLowerCase();
      if (lower === 'happiness') return 'joy';
      return lower;
    };

    const normalizedFaces = (res.faces || []).map(face => {
      const combined_final_emotion = face.combined_final_emotion ? {
        ...face.combined_final_emotion,
        label: mapLabel(face.combined_final_emotion.label)
      } : face.combined_final_emotion;

      const combined_results = (face.combined_results || []).map(r => ({
        ...r,
        label: mapLabel(r.label)
      }));

      const timeline = (face.timeline || []).map(frame => {
        const probabilities = frame.probabilities ? {
          anger: frame.probabilities.anger ?? 0,
          contempt: frame.probabilities.contempt ?? 0,
          disgust: frame.probabilities.disgust ?? 0,
          fear: frame.probabilities.fear ?? 0,
          joy: (frame.probabilities as any).happiness ?? (frame.probabilities as any).joy ?? 0,
          neutral: frame.probabilities.neutral ?? 0,
          sadness: frame.probabilities.sadness ?? 0,
          surprise: frame.probabilities.surprise ?? 0
        } : frame.probabilities;

        const dominant = frame.dominant ? {
          ...frame.dominant,
          label: mapLabel(frame.dominant.label)
        } : frame.dominant;

        return {
          ...frame,
          probabilities,
          dominant
        } as any;
      });

      return {
        ...face,
        combined_final_emotion,
        combined_results,
        timeline
      };
    });

    const scene_emotion = res.scene_emotion ? {
      ...res.scene_emotion,
      label: mapLabel(res.scene_emotion.label)
    } : res.scene_emotion;

    return {
      ...res,
      faces: normalizedFaces,
      scene_emotion
    };
  }

  protected override applySession(session: VideoAnalysisSession): void {
    this.sessionId.set(session.id);
    const normalizedResult = this.normalizeVideoResult(session.result);
    this.result.set(normalizedResult);
    this.selectedFaceId.set(null); // Reset face selection on loading historical session
    this.state.set('results');
    this.buildChartData(this.chartThemeService.getChartTheme());
  }

  protected override saveLocalSession(session: VideoAnalysisSession): void {
    const file = this.selectedFile();
    if (file) {
      this.storageService.cacheVideoBlob(session.id, file);
    }
    this.storageService.saveVideoSession(session);
  }

  protected override buildChartData(theme: Record<string, any>): void {
    const res = this.result();
    if (!res) return;

    const active = this.activeEmotionData();
    if (!active) return;

    // Build overall distribution data
    this.distributionData.set(active.probabilities.map(p => ({
      label: p.label,
      value: p.confidence_percent
    })));

    // Build timeline data: fallback to first face if selectedFaceId is null
    const faceId = this.selectedFaceId() !== null ? this.selectedFaceId() : (res.faces?.[0]?.face_id ?? null);
    if (faceId !== null) {
      const face = res.faces.find(f => f.face_id === faceId);
      if (face && face.timeline) {
        this.timelineData.set(face.timeline.map((frame: any) => ({
          label: `${frame.timestamp_sec.toFixed(1)}s`,
          probabilities: frame.probabilities,
          tooltipTitle: `Frame: ${frame.frame_index} | Timestamp: ${frame.timestamp_sec.toFixed(1)}s`
        })));
      } else {
        this.timelineData.set([]);
      }
    } else {
      this.timelineData.set([]);
    }
  }

  protected override buildSessionPayload(sid: string, result: VideoAnalysisResponse): VideoAnalysisSession {
    const file = this.selectedFile();
    return {
      id: sid,
      type: 'video',
      timestamp: new Date().toISOString(),
      inputFileName: file?.name || result.video_filename || 'Video File',
      result: result
    };
  }

  protected override syncToCloud(sid: string, result: VideoAnalysisResponse): Observable<ApiResponse<number>> {
    const file = this.selectedFile();
    return this.analysisV2Service.saveVideoAnalysis(sid, result, file!);
  }

  // ─── Video-Specific Orchestration ──────────────────────────────────

  startAnalysis(file: File) {
    if (!file) return;
    this.selectedFile.set(file);
    this.selectedFaceId.set(null); // Reset selection
    this.state.set('loading');
    this.error.set(null);
    this.showBrowseOption.set(false);
    this.userChoseToBrowse.set(false);

    this.analysisBgService.startBackgroundJob({
      label: file.name,
      type: 'video',
      resultRoute: this.analysisRoute,
      analysis$: this.videoService.analyze(file).pipe(
        map(res => this.sanitizeRawResult(res))
      ),
      onSuccess: (result: VideoAnalysisResponse, jobId: string) => {
        const session = this.buildSessionPayload(jobId, result);
        this.saveLocalSession(session);
        this.orchestrationService.syncSessionToCloud(
          jobId,
          result,
          this.analysisType,
          (sid, res) => this.analysisV2Service.saveVideoAnalysis(sid, res, file)
        );
      }
    });

    setTimeout(() => {
      if (this.state() === 'loading') {
        this.showBrowseOption.set(true);
      }
    }, 3000);
  }

  selectFace(faceId: number | null) {
    this.selectedFaceId.set(faceId);
    this.buildChartData(this.chartThemeService.getChartTheme());
  }

  continueBrowsing() {
    this.userChoseToBrowse.set(true);
    if (this.router) {
      this.router.navigate(['/dashboard']);
    }
  }

  override resetToInput(navigate = true) {
    super.resetToInput(navigate);
    this.selectedFile.set(null);
    this.selectedFaceId.set(null);
    this.showBrowseOption.set(false);
    this.userChoseToBrowse.set(false);
  }
}
