import { Injectable, inject, signal, computed } from '@angular/core';
import { Observable } from 'rxjs';

import { BaseAnalysisStore } from './base-analysis.store';
import { TextAnalysisResult, AnalysisSession } from '../models/text-analysis.model';
import { TextAnalysisService } from '../services/text-analysis.service';
import { AnalysisStorageService } from '../services/analysis-storage.service';
import { AnalysisV2Service } from '../services/analysis-v2.service';
import { ApiResponse } from '../models/api-response.model';

@Injectable()
export class TextAnalysisStore extends BaseAnalysisStore<TextAnalysisResult, AnalysisSession> {
  private analysisService = inject(TextAnalysisService);
  private storageService = inject(AnalysisStorageService);
  private analysisV2Service = inject(AnalysisV2Service);

  // ─── Base Config Hooks ────────────────────────────────────────────
  protected override readonly analysisType = 'text' as const;
  protected override readonly analysisRoute = '/analysis/text';
  protected override readonly expectedApiType = 'Text';

  // ─── Text-Specific State ──────────────────────────────────────────
  inputText = signal<string>('');

  // ─── Computed Signals ─────────────────────────────────────────────
  charCount = computed(() => this.inputText().length);
  tokenEstimate = computed(() => Math.round(this.inputText().length / 4));
  sentenceCount = computed(() => {
    const t = this.inputText().trim();
    if (!t) return 0;
    return (t.match(/[.!?]+/g) || []).length + 1;
  });

  modelChips = computed(() => {
    const r = this.result();
    if (!r) return [];
    return [
      { label: 'Model', value: r.model_info.name, mono: true },
      { label: 'Processing Time', value: `${r.processing_time_ms.toFixed(0)}ms`, mono: false },
      { label: 'Token Count', value: `${r.input_info.token_count}`, mono: false },
      { label: 'Device', value: r.model_info.device_used.toUpperCase(), mono: false },
    ];
  });

  emotionalInsights = computed(() => {
    const res = this.result();
    if (!res) return null;

    const sorted = [...res.combined_results].sort((a, b) => b.confidence_percent - a.confidence_percent);
    const primary = sorted[0];
    const diversity = res.combined_results.filter(r => r.confidence_percent > 5).length;

    const posKeys = ['joy', 'surprise'];
    const negKeys = ['anger', 'disgust', 'fear', 'sadness'];

    let posScore = 0;
    let negScore = 0;
    res.combined_results.forEach(r => {
      const label = r.label.toLowerCase();
      if (posKeys.includes(label)) posScore += r.confidence_percent;
      else if (negKeys.includes(label)) negScore += r.confidence_percent;
    });

    let polarity = 'Neutral';
    let polarityColor = '#778ca3';

    if (posScore > negScore + 15) {
      polarity = 'Positive';
      polarityColor = '#ffd32a';
    } else if (negScore > posScore + 15) {
      polarity = 'Negative';
      polarityColor = '#ff4757';
    }

    return {
      primary: primary.label,
      diversity,
      polarity,
      polarityColor,
      complexity: diversity > 3 ? 'Complex' : (diversity > 1 ? 'Balanced' : 'Direct')
    };
  });

  // ─── Base Store Hook Implementations ──────────────────────────────

  protected override findLocalSession(id: string): AnalysisSession | null {
    return this.storageService.getSessionById(id)
      || this.storageService.getSessions().find(s => s.cloudId === Number(id))
      || null;
  }

  protected override applySession(session: AnalysisSession): void {
    this.sessionId.set(session.id);
    this.inputText.set(session.input);
    this.result.set(session.result);
    this.state.set('results');
    this.buildChartData(this.chartThemeService.getChartTheme());
  }

  protected override saveLocalSession(session: AnalysisSession): void {
    this.storageService.saveSession(session);
  }

  protected override buildChartData(theme: Record<string, any>): void {
    const res = this.result();
    if (!res) return;

    this.timelineData.set(res.sentences_analysis.map((s, i) => ({
      label: `S${i + 1}`,
      probabilities: s.probabilities as any,
      tooltipTitle: `Sentence ${i + 1}`,
      tooltipDetail: s.sentence
    })));

    this.distributionData.set(res.combined_results.map(r => ({
      label: r.label,
      value: r.confidence_percent
    })));
  }

  protected override buildSessionPayload(sid: string, result: TextAnalysisResult): AnalysisSession {
    return {
      id: sid,
      type: 'text',
      timestamp: new Date().toISOString(),
      input: this.inputText(),
      result: result
    };
  }

  protected override syncToCloud(sid: string, result: TextAnalysisResult): Observable<ApiResponse<number>> {
    return this.analysisV2Service.saveTextAnalysis(sid, result);
  }

  // ─── Text-Specific Orchestration ──────────────────────────────────

  startAnalysis() {
    this.executeAnalysisFlow(
      this.analysisService.analyze(this.inputText())
    );
  }

  override resetToInput(navigate = true) {
    super.resetToInput(navigate);
    // Extra text-specific cleanup can go here if needed
  }
}
