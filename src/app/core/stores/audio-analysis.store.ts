import { Injectable, inject, signal, computed, effect, untracked } from '@angular/core';
import { Observable } from 'rxjs';

import { BaseAnalysisStore } from './base-analysis.store';
import { AudioAnalysisResponse, AudioAnalysisSession, AudioSegment } from '../models/audio-analysis.model';
import { AudioAnalysisService } from '../services/audio-analysis.service';
import { AnalysisStorageService } from '../services/analysis-storage.service';
import { AnalysisV2Service } from '../services/analysis-v2.service';
import { AnalysisBgService } from '../services/analysis-bg.service';
import { ApiResponse } from '../models/api-response.model';
import { DistributionDataPoint } from '../models/chart-data.model';

@Injectable()
export class AudioAnalysisStore extends BaseAnalysisStore<AudioAnalysisResponse, AudioAnalysisSession> {
  private audioService = inject(AudioAnalysisService);
  private storageService = inject(AnalysisStorageService);
  private analysisV2Service = inject(AnalysisV2Service);
  private analysisBgService = inject(AnalysisBgService);

  // ─── Base Config Hooks ────────────────────────────────────────────
  protected override readonly analysisType = 'audio' as const;
  protected override readonly analysisRoute = '/analysis/audio';
  protected override readonly expectedApiType = 'Audio';

  // ─── Audio-Specific State ──────────────────────────────────────────
  selectedFile = signal<File | null>(null);
  showBrowseOption = signal<boolean>(false);
  userChoseToBrowse = signal<boolean>(false);
  textDistributionData = signal<DistributionDataPoint[]>([]);

  // ─── Computed Signals ─────────────────────────────────────────────
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

    // Background Job Results Effect
    effect(() => {
      const jobResult = this.analysisBgService.jobResult();
      if (jobResult && this.state() === 'loading' && !this.userChoseToBrowse()) {
         untracked(() => {
            const sid = jobResult.id;
            const res = jobResult.result as AudioAnalysisResponse;
            this.result.set(res);
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

  protected override findLocalSession(id: string): AudioAnalysisSession | null {
    return this.storageService.getAudioSessionById(id)
      || this.storageService.getAudioSessions().find(s => s.cloudId === Number(id))
      || null;
  }

  protected override applySession(session: AudioAnalysisSession): void {
    this.sessionId.set(session.id);
    this.result.set(session.result);
    this.state.set('results');
    this.buildChartData(this.chartThemeService.getChartTheme());
  }

  protected override saveLocalSession(session: AudioAnalysisSession): void {
    this.storageService.saveAudioSession(session);
  }

  protected override buildChartData(theme: Record<string, any>): void {
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

  protected override buildSessionPayload(sid: string, result: AudioAnalysisResponse): AudioAnalysisSession {
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

  protected override syncToCloud(sid: string, result: AudioAnalysisResponse): Observable<ApiResponse<number>> {
    const file = this.selectedFile();
    return this.analysisV2Service.saveAudioAnalysis(sid, result, file!);
  }

  // ─── Audio-Specific Orchestration ──────────────────────────────────

  startAnalysis(file: File) {
    if (!file) return;
    this.selectedFile.set(file);
    this.state.set('loading');
    this.error.set(null);
    this.showBrowseOption.set(false);
    this.userChoseToBrowse.set(false);

    this.analysisBgService.startBackgroundJob({
      label: file.name,
      type: 'audio',
      resultRoute: this.analysisRoute,
      analysis$: this.audioService.analyze(file),
      onSuccess: (result: AudioAnalysisResponse, jobId: string) => {
        const session = this.buildSessionPayload(jobId, result);
        this.saveLocalSession(session);
        this.storageService.cacheAudioBlob(jobId, file);
        this.orchestrationService.syncSessionToCloud(
          jobId,
          result,
          this.analysisType,
          (sid, res) => this.syncToCloud(sid, res)
        );
      }
    });

    setTimeout(() => {
      if (this.state() === 'loading') {
        this.showBrowseOption.set(true);
      }
    }, 3000);
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

  continueBrowsing() {
    this.userChoseToBrowse.set(true);
    if (this.router) {
      this.router.navigate(['/dashboard']);
    }
  }

  override resetToInput(navigate = true) {
    super.resetToInput(navigate);
    this.selectedFile.set(null);
    this.showBrowseOption.set(false);
    this.userChoseToBrowse.set(false);
  }
}
