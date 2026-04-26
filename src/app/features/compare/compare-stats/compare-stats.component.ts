import { Component, input, computed } from '@angular/core';

import { AnalysisSession, AudioAnalysisSession, TextAnalysisResult } from '../../../core/models/text-analysis.model';
import { AudioAnalysisResponse } from '../../../core/models/audio-analysis.model';

@Component({
  selector: 'app-compare-stats',
  standalone: true,
  imports: [],
  templateUrl: './compare-stats.component.html',
  styleUrls: ['./compare-stats.component.css']
})
export class CompareStatsComponent {
  analysisA = input.required<AnalysisSession | AudioAnalysisSession | null>();
  analysisB = input.required<AnalysisSession | AudioAnalysisSession | null>();

  statsRows = computed(() => {
    if (!this.analysisA() || !this.analysisB()) return [];

    const a = this.analysisA()!;
    const b = this.analysisB()!;

    const domA = this.getDominant(a);
    const domB = this.getDominant(b);

    const lenA = this.getInputLength(a);
    const lenB = this.getInputLength(b);

    const segA = this.getSegments(a);
    const segB = this.getSegments(b);

    const tokA = this.getTokens(a);
    const tokB = this.getTokens(b);

    const procA = this.getProcTime(a);
    const procB = this.getProcTime(b);

    const modelA = this.getModel(a);
    const modelB = this.getModel(b);

    const devA = this.getDevice(a);
    const devB = this.getDevice(b);

    return [
      {
        label: 'Date',
        valA: new Date(a.timestamp).toLocaleDateString() + ' ' + new Date(a.timestamp).toLocaleTimeString(),
        valB: new Date(b.timestamp).toLocaleDateString() + ' ' + new Date(b.timestamp).toLocaleTimeString(),
        diff: this.getDateDiff(a.timestamp, b.timestamp)
      },
      {
        label: 'Dominant Emotion',
        valA: domA.label,
        valB: domB.label,
        diff: domA.label === domB.label ? 'Matched' : 'Changed',
        isEmotion: true
      },
      {
        label: 'Confidence',
        valA: `${domA.confidence.toFixed(2)}%`,
        valB: `${domB.confidence.toFixed(2)}%`,
        diff: this.formatDelta(domB.confidence - domA.confidence, '%')
      },
      {
        label: a.type === 'text' ? 'Sentences' : 'Segments',
        valA: segA.toString(),
        valB: segB.toString(),
        diff: this.formatDelta(segB - segA, '')
      },
      {
        label: 'Token Count',
        valA: tokA > 0 ? tokA.toString() : 'N/A',
        valB: tokB > 0 ? tokB.toString() : 'N/A',
        diff: (tokA > 0 && tokB > 0) ? this.formatDelta(tokB - tokA, '') : '-'
      },
      {
        label: 'Processing Time',
        valA: `${procA}ms`,
        valB: `${procB}ms`,
        diff: this.formatDelta(procB - procA, 'ms', true)
      },
      {
        label: 'Input Length',
        valA: a.type === 'text' ? `${lenA} chars` : `${lenA.toFixed(1)}s`,
        valB: b.type === 'text' ? `${lenB} chars` : `${lenB.toFixed(1)}s`,
        diff: a.type === b.type ? this.formatDelta(lenB - lenA, a.type === 'text' ? ' chars' : 's') : '-'
      },

      {
        label: 'Device Used',
        valA: devA,
        valB: devB,
        diff: devA === devB ? 'Same' : 'Differs'
      }
    ];
  });

  private getDominant(session: any) {
    if (session.type === 'text') {
      const r = session.result as TextAnalysisResult;
      return r.combined_final_emotion;
    }
    const r = session.result as AudioAnalysisResponse;
    return r.final_multimodal_emotion;
  }

  private getInputLength(session: any): number {
    return session.type === 'text' ? (session.result as TextAnalysisResult).input_info.input_length : (session as AudioAnalysisSession).durationSeconds;
  }

  private getSegments(session: any): number {
    return session.type === 'text' ? (session.result as TextAnalysisResult).sentences_count : session.result.audio_emotion?.segments_count;
  }

  private getTokens(session: any): number {
    return session.type === 'text' ? (session.result as TextAnalysisResult).input_info.token_count : session.result.text_emotion?.input_info?.token_count || 0;
  }

  private getProcTime(session: any): number {
    return session.result.processing_time_ms || 0;
  }

  private getModel(session: any): string {
    return session.type === 'text' ? (session.result as TextAnalysisResult).model_info.name : session.result.model_info.fusion_version || 'Multimodal';
  }

  private getDevice(session: any): string {
    return session.type === 'text' ? (session.result as TextAnalysisResult).model_info.device_used : 'cpu/gpu';
  }

  private formatDelta(num: number, suffix: string, reverseColors = false): string {
    if (num === 0) return 'Same';
    const sign = num > 0 ? '+' : '';
    // return a span with classes? simpler to just pass the string and let template style
    return `${sign}${num % 1 !== 0 ? num.toFixed(2) : num}${suffix}`;
  }

  private getDateDiff(ds1: string, ds2: string): string {
    const d1 = new Date(ds1).getTime();
    const d2 = new Date(ds2).getTime();
    const diffHours = Math.abs(d2 - d1) / (1000 * 60 * 60);
    if (diffHours < 24) return `${diffHours.toFixed(1)} hrs apart`;
    return `${(diffHours / 24).toFixed(1)} days apart`;
  }

  getEmotionColor(label: string): string {
    return `var(--emotion-${label?.toLowerCase() || 'neutral'})`;
  }
}
