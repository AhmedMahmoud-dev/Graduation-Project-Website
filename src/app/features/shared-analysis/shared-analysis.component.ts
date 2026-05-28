import { Component, inject, signal, OnInit, OnDestroy, effect, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Meta } from '@angular/platform-browser';
import { AnalysisV2Service } from '../../core/services/analysis-v2.service';
import { EmotionColorService } from '../../core/services/emotion-color.service';
import { FormattingService } from '../../core/services/formatting.service';
import { ChartThemeService } from '../../core/services/chart-theme.service';
import { SharedAnalysisDto } from '../../core/models/share-feature.model';
import { TimelineDataPoint, DistributionDataPoint } from '../../core/models/chart-data.model';

import { EmotionTimelineComponent } from '../../shared/components/emotion-charts/emotion-timeline/emotion-timeline.component';
import { EmotionDistributionComponent } from '../../shared/components/emotion-charts/emotion-distribution/emotion-distribution.component';
import { DominantEmotionHeroComponent } from '../../shared/components/analysis/dominant-emotion-hero/dominant-emotion-hero.component';
import { AnalysisBreakdownCardComponent } from '../../shared/components/analysis/analysis-breakdown-card/analysis-breakdown-card.component';
import { ModelInfoGridComponent } from '../../shared/components/analysis/model-info-grid/model-info-grid.component';
import { LoadingStateComponent } from '../../shared/components/loading-state/loading-state.component';
import { FooterSectionComponent } from '../../shared/components/footer/footer.component';
import { AnalysisSectionHeaderComponent } from '../../shared/components/analysis-section-header/analysis-section-header.component';
import { AppIconComponent } from '../../shared/components/app-icon/app-icon.component';

@Component({
  selector: 'app-shared-analysis',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    EmotionTimelineComponent,
    EmotionDistributionComponent,
    DominantEmotionHeroComponent,
    AnalysisBreakdownCardComponent,
    ModelInfoGridComponent,
    LoadingStateComponent,
    FooterSectionComponent,
    AnalysisSectionHeaderComponent,
    AppIconComponent
  ],
  templateUrl: './shared-analysis.component.html',
  styleUrl: './shared-analysis.component.css'
})
export class SharedAnalysisComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private analysisV2Service = inject(AnalysisV2Service);
  private meta = inject(Meta);
  protected colorService = inject(EmotionColorService);
  protected format = inject(FormattingService);
  private chartThemeService = inject(ChartThemeService);

  shareToken = signal<string>('');
  isLoading = signal<boolean>(true);
  error = signal<string | null>(null);
  result = signal<SharedAnalysisDto | null>(null);

  // Chart data signals
  timelineData = signal<TimelineDataPoint[]>([]);
  distributionData = signal<DistributionDataPoint[]>([]);
  textDistributionData = signal<DistributionDataPoint[]>([]);

  // UI state
  showTextAnalysis = signal<boolean>(false);
  selectedFaceId = signal<number | null>(null);

  activeEmotionData = computed(() => {
    const raw = this.result();
    if (!raw) return null;

    const type = raw.type.toLowerCase();
    const result = raw.result;

    if (type === 'image') {
      const faceId = this.selectedFaceId();
      if (faceId !== null) {
        const face = result.faces?.find((f: any) => f.face_id === faceId);
        if (face) {
          return {
            label: face.combined_final_emotion.label,
            confidence_percent: face.combined_final_emotion.confidence_percent,
            category: face.combined_final_emotion.category,
            probabilities: face.combined_results
          };
        }
      }
      return {
        label: result.scene_emotion?.label ?? 'neutral',
        confidence_percent: result.scene_emotion?.confidence_percent ?? 0,
        category: result.scene_emotion?.category ?? 'neutral',
        probabilities: result.scene_emotion ? [
          {
            label: result.scene_emotion.label,
            confidence: result.scene_emotion.confidence ?? (result.scene_emotion.confidence_percent / 100),
            confidence_percent: result.scene_emotion.confidence_percent
          }
        ] : []
      };
    } else if (type === 'video') {
      const faceId = this.selectedFaceId();
      if (faceId !== null) {
        const face = result.faces?.find((f: any) => f.face_id === faceId);
        if (face) {
          return {
            label: face.combined_final_emotion.label,
            confidence_percent: face.combined_final_emotion.confidence_percent,
            category: face.combined_final_emotion.category,
            probabilities: face.combined_results
          };
        }
      }
      return {
        label: result.scene_emotion?.label ?? 'neutral',
        confidence_percent: result.scene_emotion?.confidence_percent ?? 0,
        category: result.scene_emotion?.category ?? 'neutral',
        probabilities: result.scene_emotion ? [
          {
            label: result.scene_emotion.label,
            confidence: result.scene_emotion.confidence ?? (result.scene_emotion.confidence_percent / 100),
            confidence_percent: result.scene_emotion.confidence_percent
          }
        ] : []
      };
    }

    return null;
  });

  constructor() {
    // Re-build charts when theme changes and result exists
    effect(() => {
      const theme = this.chartThemeService.getChartTheme();
      if (this.result()) {
        this.buildCharts(theme);
      }
    });
  }

  ngOnInit() {
    // Inject robots meta tag to prevent search index crawler visibility
    this.meta.addTag({ name: 'robots', content: 'noindex, nofollow' });

    this.route.params.subscribe(params => {
      const token = params['shareToken'];
      if (token) {
        this.shareToken.set(token);
        this.loadSharedDetails(token);
      } else {
        this.error.set('No share token provided.');
        this.isLoading.set(false);
      }
    });
  }

  ngOnDestroy() {
    // Remove the robots meta tags when navigating away
    this.meta.removeTag("name='robots'");
  }

  private loadSharedDetails(token: string) {
    this.isLoading.set(true);
    this.analysisV2Service.getSharedAnalysisDetails(token).subscribe({
      next: (res) => {
        if (res.is_success && res.data) {
          const raw = res.data;
          // Normalize results labels from 'happiness' to 'joy' just like original stores do
          this.result.set(this.normalizeResultLabels(raw));
        } else {
          this.error.set(res.message || 'This sharing link is invalid or has expired.');
        }
        this.isLoading.set(false);
      },
      error: (err) => {
        this.error.set('This link has expired or is invalid.');
        this.isLoading.set(false);
      }
    });
  }

  private normalizeResultLabels(raw: SharedAnalysisDto): SharedAnalysisDto {
    const mapLabel = (label: string): string => {
      const lower = label.toLowerCase();
      if (lower === 'happiness') return 'joy';
      return lower;
    };

    const type = raw.type.toLowerCase();
    const result = raw.result;

    if (type === 'text') {
      if (result.combined_final_emotion) {
        result.combined_final_emotion.label = mapLabel(result.combined_final_emotion.label);
      }
      if (result.full_text_analysis?.dominant) {
        result.full_text_analysis.dominant.label = mapLabel(result.full_text_analysis.dominant.label);
      }
      if (result.combined_results) {
        result.combined_results.forEach((r: any) => r.label = mapLabel(r.label));
      }
      if (result.sentences_analysis) {
        result.sentences_analysis.forEach((s: any) => {
          if (s.dominant) s.dominant.label = mapLabel(s.dominant.label);
        });
      }
    } else if (type === 'audio') {
      if (result.final_multimodal_emotion) {
        result.final_multimodal_emotion.label = mapLabel(result.final_multimodal_emotion.label);
      }
      if (result.final_multimodal_results) {
        result.final_multimodal_results.forEach((r: any) => r.label = mapLabel(r.label));
      }
      if (result.audio_emotion?.timeline) {
        result.audio_emotion.timeline.forEach((seg: any) => {
          if (seg.dominant) seg.dominant.label = mapLabel(seg.dominant.label);
        });
      }
      if (result.text_emotion) {
        if (result.text_emotion.combined_final_emotion) {
          result.text_emotion.combined_final_emotion.label = mapLabel(result.text_emotion.combined_final_emotion.label);
        }
        if (result.text_emotion.combined_results) {
          result.text_emotion.combined_results.forEach((r: any) => r.label = mapLabel(r.label));
        }
        if (result.text_emotion.sentences_analysis) {
          result.text_emotion.sentences_analysis.forEach((s: any) => {
            if (s.dominant) s.dominant.label = mapLabel(s.dominant.label);
          });
        }
      }
    } else if (type === 'image') {
      if (result.faces) {
        result.faces.forEach((face: any) => {
          if (face.combined_final_emotion) face.combined_final_emotion.label = mapLabel(face.combined_final_emotion.label);
          if (face.combined_results) face.combined_results.forEach((r: any) => r.label = mapLabel(r.label));
        });
      }
      if (result.scene_emotion) {
        result.scene_emotion.label = mapLabel(result.scene_emotion.label);
      }
    } else if (type === 'video') {
      if (result.faces) {
        result.faces.forEach((face: any) => {
          if (face.combined_final_emotion) face.combined_final_emotion.label = mapLabel(face.combined_final_emotion.label);
          if (face.combined_results) face.combined_results.forEach((r: any) => r.label = mapLabel(r.label));
          if (face.timeline) {
            face.timeline.forEach((frame: any) => {
              if (frame.dominant) frame.dominant.label = mapLabel(frame.dominant.label);
            });
          }
        });
      }
      if (result.scene_emotion) {
        result.scene_emotion.label = mapLabel(result.scene_emotion.label);
      }
    }

    return raw;
  }

  private buildCharts(theme: Record<string, any>) {
    const raw = this.result();
    if (!raw) return;

    const type = raw.type.toLowerCase();
    const result = raw.result;

    if (type === 'text') {
      // Timeline Data
      this.timelineData.set(result.sentences_analysis.map((s: any, i: number) => ({
        label: `S${i + 1}`,
        probabilities: s.probabilities,
        tooltipTitle: `Sentence ${i + 1}`,
        tooltipDetail: s.sentence
      })));

      // Distribution Data
      this.distributionData.set(result.combined_results.map((r: any) => ({
        label: r.label,
        value: r.confidence_percent
      })));
    } else if (type === 'audio') {
      // Timeline Data
      this.timelineData.set(result.audio_emotion.timeline.map((segment: any) => ({
        label: `${segment.timestamp_offset.toFixed(1)}s`,
        probabilities: segment.probabilities,
        tooltipTitle: `Timestamp: ${segment.timestamp_offset.toFixed(1)}s`
      })));

      // Final Distribution Data
      this.distributionData.set(result.final_multimodal_results.map((r: any) => ({
        label: r.label,
        value: r.confidence * 100
      })));

      // Text Track Distribution Data
      this.textDistributionData.set(result.text_emotion.combined_results.map((r: any) => ({
        label: r.label,
        value: r.confidence * 100
      })));
    } else if (type === 'image') {
      const activeFace = this.getActiveImageFace();
      if (activeFace) {
        this.distributionData.set(activeFace.combined_results.map((p: any) => ({
          label: p.label,
          value: p.confidence_percent
        })));
      } else {
        // Scene distribution
        this.distributionData.set([
          {
            label: result.scene_emotion.label,
            value: result.scene_emotion.confidence_percent
          }
        ]);
      }
      this.timelineData.set([]);
    } else if (type === 'video') {
      const activeFace = this.getActiveVideoFace();
      if (activeFace) {
        this.distributionData.set(activeFace.combined_results.map((p: any) => ({
          label: p.label,
          value: p.confidence_percent
        })));

        if (activeFace.timeline) {
          this.timelineData.set(activeFace.timeline.map((frame: any) => ({
            label: `${frame.timestamp_sec.toFixed(1)}s`,
            probabilities: frame.probabilities,
            tooltipTitle: `Frame: ${frame.frame_index} | Timestamp: ${frame.timestamp_sec.toFixed(1)}s`
          })));
        }
      } else {
        // Scene distribution
        this.distributionData.set([
          {
            label: result.scene_emotion.label,
            value: result.scene_emotion.confidence_percent
          }
        ]);
        
        // Default timeline to the first face track's timeline if available, so there is a timeline to view
        const firstFace = result.faces?.[0];
        if (firstFace && firstFace.timeline) {
          this.timelineData.set(firstFace.timeline.map((frame: any) => ({
            label: `${frame.timestamp_sec.toFixed(1)}s`,
            probabilities: frame.probabilities,
            tooltipTitle: `Frame: ${frame.frame_index} | Timestamp: ${frame.timestamp_sec.toFixed(1)}s`
          })));
        } else {
          this.timelineData.set([]);
        }
      }
    }
  }

  getActiveImageFace() {
    const result = this.result()?.result;
    if (!result || this.selectedFaceId() === null) return null;
    return result.faces?.find((f: any) => f.face_id === this.selectedFaceId()) || null;
  }

  getActiveVideoFace() {
    const result = this.result()?.result;
    if (!result || this.selectedFaceId() === null) return null;
    return result.faces?.find((f: any) => f.face_id === this.selectedFaceId()) || null;
  }

  getMostFrequentDominantAudio() {
    const res = this.result()?.result;
    if (!res) return 'neutral';
    const counts: Record<string, number> = {};
    res.audio_emotion.timeline.forEach((s: any) => {
      const label = s.dominant.label;
      counts[label] = (counts[label] || 0) + 1;
    });
    const winner = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
    return winner ? winner[0] : 'neutral';
  }

  getModelChips(): any[] {
    const raw = this.result();
    if (!raw) return [];
    const res = raw.result;
    const type = raw.type.toLowerCase();

    if (type === 'text') {
      return [
        { label: 'Model', value: res.model_info.name, mono: true },
        { label: 'Processing Time', value: `${res.processing_time_ms.toFixed(0)}ms`, mono: false },
        { label: 'Token Count', value: `${res.input_info.token_count}`, mono: false },
        { label: 'Device', value: res.model_info.device_used.toUpperCase(), mono: false },
      ];
    } else if (type === 'audio') {
      return [
        { label: 'Audio Model', value: res.model_info.audio_model, mono: false },
        { label: 'Whisper', value: `v${res.model_info.whisper_model}`, mono: false },
        { label: 'Fusion Engine', value: res.model_info.fusion_version, mono: false },
        { label: 'Duration', value: `${res.audio_emotion.duration_seconds}s`, mono: false },
        { label: 'Processing', value: `${res.processing_time_ms}ms`, mono: true },
      ];
    } else if (type === 'image') {
      return [
        { label: 'Detector', value: res.model_info.detector, mono: false },
        { label: 'Emotion Model', value: res.model_info.emotion_model, mono: false },
        { label: 'Faces Detected', value: `${res.faces_detected}`, mono: false },
        { label: 'Processing Time', value: `${res.processing_time_ms}ms`, mono: true },
      ];
    } else if (type === 'video') {
      return [
        { label: 'Detector', value: res.model_info.detector, mono: false },
        { label: 'Emotion Model', value: res.model_info.emotion_model, mono: false },
        { label: 'Tracker', value: res.model_info.tracker, mono: false },
        { label: 'Sampled Frames', value: `${res.sampled_frames}/${res.total_frames}`, mono: false },
        { label: 'Processing Time', value: `${res.processing_time_ms}ms`, mono: true },
      ];
    }

    return [];
  }
}
