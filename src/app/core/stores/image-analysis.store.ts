import { Injectable, inject, signal, computed } from '@angular/core';
import { Observable, map } from 'rxjs';

import { BaseAnalysisStore } from './base-analysis.store';
import { ImageAnalysisResponse, ImageAnalysisSession } from '../models/image-analysis.model';
import { ImageAnalysisService } from '../services/image-analysis.service';
import { AnalysisStorageService } from '../services/analysis-storage.service';
import { AnalysisV2Service } from '../services/analysis-v2.service';
import { ApiResponse } from '../models/api-response.model';

@Injectable()
export class ImageAnalysisStore extends BaseAnalysisStore<ImageAnalysisResponse, ImageAnalysisSession> {
  private imageService = inject(ImageAnalysisService);
  private storageService = inject(AnalysisStorageService);
  private analysisV2Service = inject(AnalysisV2Service);

  // ─── Base Config Hooks ────────────────────────────────────────────
  protected override readonly analysisType = 'image' as const;
  protected override readonly analysisRoute = '/analysis/image';
  protected override readonly expectedApiType = 'Image';

  // ─── Image-Specific State ──────────────────────────────────────────
  selectedFile = signal<File | null>(null);
  selectedFaceId = signal<number | null>(null); // null means Scene Context

  // ─── Computed Signals ─────────────────────────────────────────────
  modelChips = computed(() => {
    const res = this.result();
    if (!res) return [];
    return [
      { label: 'Detector', value: res.model_info.detector, mono: false },
      { label: 'Emotion Model', value: res.model_info.emotion_model, mono: false },
      { label: 'Faces Detected', value: `${res.faces_detected}`, mono: false },
      {
        label: 'Resolution',
        value: res.frame_quality.was_downscaled
          ? `${res.frame_quality.downscaled_to[0]}x${res.frame_quality.downscaled_to[1]} (Downscaled)`
          : `${res.frame_quality.original_width}x${res.frame_quality.original_height}`,
        mono: false
      },
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
      complexity: 'Direct'
    };
  });

  // ─── Base Store Hook Implementations ──────────────────────────────

  protected override findLocalSession(id: string): ImageAnalysisSession | null {
    return this.storageService.getImageSessionById(id)
      || this.storageService.getImageSessions().find(s => s.cloudId === Number(id))
      || null;
  }

  private normalizeImageResult(res: ImageAnalysisResponse): ImageAnalysisResponse {
    if (!res) return res;

    const mapLabel = (label: string): string => {
      return label.toLowerCase() === 'happiness' ? 'joy' : label;
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

      return {
        ...face,
        combined_final_emotion,
        combined_results
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

  protected override applySession(session: ImageAnalysisSession): void {
    this.sessionId.set(session.id);
    const normalizedResult = this.normalizeImageResult(session.result);
    this.result.set(normalizedResult);
    this.selectedFaceId.set(null); // Reset face selection on new session load
    this.state.set('results');
    this.buildChartData(this.chartThemeService.getChartTheme());
  }

  protected override saveLocalSession(session: ImageAnalysisSession): void {
    const file = this.selectedFile();
    if (file) {
      this.storageService.cacheImageBlob(session.id, file);
    }
    this.storageService.saveImageSession(session);
  }

  protected override buildChartData(theme: Record<string, any>): void {
    const active = this.activeEmotionData();
    if (!active) return;

    // Build distribution data for the active face or scene
    this.distributionData.set(active.probabilities.map(p => ({
      label: p.label,
      value: p.confidence_percent
    })));

    // Timeline data is empty for static images
    this.timelineData.set([]);
  }

  protected override buildSessionPayload(sid: string, result: ImageAnalysisResponse): ImageAnalysisSession {
    const file = this.selectedFile();
    return {
      id: sid,
      type: 'image',
      timestamp: new Date().toISOString(),
      inputFileName: file?.name || result.image_filename || 'Image File',
      result: result
    };
  }

  protected override syncToCloud(sid: string, result: ImageAnalysisResponse): Observable<ApiResponse<number>> {
    const file = this.selectedFile();
    return this.analysisV2Service.saveImageAnalysis(sid, result, file!);
  }

  // ─── Image-Specific Orchestration ──────────────────────────────────

  startAnalysis(file: File) {
    if (!file) return;
    this.selectedFile.set(file);
    this.selectedFaceId.set(null); // Reset face selection
    this.executeAnalysisFlow(
      this.imageService.analyze(file).pipe(
        map(res => this.normalizeImageResult(res))
      )
    );
  }

  selectFace(faceId: number | null) {
    this.selectedFaceId.set(faceId);
    this.buildChartData(this.chartThemeService.getChartTheme());
  }

  override resetToInput(navigate = true) {
    super.resetToInput(navigate);
    this.selectedFile.set(null);
    this.selectedFaceId.set(null);
  }
}
