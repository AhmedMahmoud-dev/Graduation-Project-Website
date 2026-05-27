import { Component, input, computed, inject } from '@angular/core';
import { AnalysisSession, AudioAnalysisSession, TextAnalysisResult } from '../../../core/models/text-analysis.model';
import { ImageAnalysisSession } from '../../../core/models/image-analysis.model';
import { VideoAnalysisSession } from '../../../core/models/video-analysis.model';
import { AudioAnalysisResponse } from '../../../core/models/audio-analysis.model';
import { FormattingService } from '../../../core/services/formatting.service';
import { AnalysisSectionHeaderComponent } from '../../../shared/components/analysis-section-header/analysis-section-header.component';


@Component({
  selector: 'app-compare-stats',
  standalone: true,
  imports: [AnalysisSectionHeaderComponent],

  templateUrl: './compare-stats.component.html',
  styleUrls: ['./compare-stats.component.css']
})
export class CompareStatsComponent {
  protected format = inject(FormattingService);
  analysisA = input.required<AnalysisSession | AudioAnalysisSession | ImageAnalysisSession | VideoAnalysisSession | null>();
  analysisB = input.required<AnalysisSession | AudioAnalysisSession | ImageAnalysisSession | VideoAnalysisSession | null>();

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

    const rows = [
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
        valA: `${domA.confidence_percent.toFixed(1)}%`,
        valB: `${domB.confidence_percent.toFixed(1)}%`,
        diff: this.formatDelta(domB.confidence_percent - domA.confidence_percent, '%')
      },
      {
        label: this.getSegmentLabel(a.type),
        valA: segA.toString(),
        valB: segB.toString(),
        diff: this.formatDelta(segB - segA, '')
      }
    ];

    if (a.type === 'text' || b.type === 'text' || a.type === 'audio' || b.type === 'audio') {
      rows.push({
        label: 'Token Count',
        valA: tokA > 0 ? tokA.toString() : 'N/A',
        valB: tokB > 0 ? tokB.toString() : 'N/A',
        diff: (tokA > 0 && tokB > 0) ? this.formatDelta(tokB - tokA, '') : '-'
      });
    }

    if (a.type === 'image' && b.type === 'image') {
      rows.push({
        label: 'Resolution',
        valA: `${a.result.frame_quality.original_width}x${a.result.frame_quality.original_height}`,
        valB: `${b.result.frame_quality.original_width}x${b.result.frame_quality.original_height}`,
        diff: a.result.frame_quality.was_downscaled || b.result.frame_quality.was_downscaled ? 'Resized' : 'Original'
      });
    }

    rows.push({
      label: 'Processing Time',
      valA: `${procA}ms`,
      valB: `${procB}ms`,
      diff: this.formatDelta(procB - procA, 'ms', true)
    });

    rows.push({
      label: this.getInputLabel(a.type),
      valA: this.formatInputVal(a),
      valB: this.formatInputVal(b),
      diff: a.type === b.type ? this.formatDelta(lenB - lenA, this.getInputSuffix(a.type)) : '-'
    });

    rows.push({
      label: 'Device Used',
      valA: devA,
      valB: devB,
      diff: devA === devB ? 'Same' : 'Differs'
    });

    return rows;
  });

  private getDominant(session: any) {
    if (session.type === 'text') {
      return (session.result as TextAnalysisResult).combined_final_emotion;
    } else if (session.type === 'audio') {
      return (session.result as AudioAnalysisResponse).final_multimodal_emotion;
    }
    return session.result.scene_emotion;
  }

  private getSegmentLabel(type: string): string {
    switch (type) {
      case 'text': return 'Sentences';
      case 'audio': return 'Audio Segments';
      case 'image': return 'Faces Detected';
      case 'video': return 'Faces Tracked';
      default: return 'Segments';
    }
  }

  private getInputLabel(type: string): string {
    switch (type) {
      case 'text': return 'Text Length';
      case 'audio': return 'Audio Duration';
      case 'image': return 'Image Quality';
      case 'video': return 'Video Duration';
      default: return 'Input Length';
    }
  }

  private formatInputVal(session: any): string {
    const type = session.type;
    if (type === 'text') return `${(session.result as TextAnalysisResult).input_info.input_length} chars`;
    if (type === 'audio') return `${session.durationSeconds.toFixed(1)}s`;
    if (type === 'video') return `${session.result.duration_seconds.toFixed(1)}s`;
    if (type === 'image') return session.result.frame_quality.was_downscaled ? 'Downscaled' : 'Native';
    return '-';
  }

  private getInputSuffix(type: string): string {
    if (type === 'text') return ' chars';
    if (type === 'audio' || type === 'video') return 's';
    return '';
  }

  private getInputLength(session: any): number {
    if (session.type === 'text') return (session.result as TextAnalysisResult).input_info.input_length;
    if (session.type === 'audio') return session.durationSeconds;
    if (session.type === 'video') return session.result.duration_seconds;
    return 0;
  }

  private getSegments(session: any): number {
    if (session.type === 'text') return (session.result as TextAnalysisResult).sentences_count;
    if (session.type === 'audio') return session.result.audio_emotion?.segments_count || 0;
    if (session.type === 'image') return session.result.faces_detected;
    if (session.type === 'video') return session.result.faces_tracked;
    return 0;
  }

  private getTokens(session: any): number {
    if (session.type === 'text') return (session.result as TextAnalysisResult).input_info.token_count;
    if (session.type === 'audio') return session.result.text_emotion?.input_info?.token_count || 0;
    return 0;
  }

  private getProcTime(session: any): number {
    return session.result.processing_time_ms || 0;
  }

  private getModel(session: any): string {
    if (session.type === 'text') return (session.result as TextAnalysisResult).model_info.name;
    if (session.type === 'audio') return session.result.model_info.fusion_version || 'Multimodal';
    return session.result.model_info.version || 'v1.0';
  }

  private getDevice(session: any): string {
    if (session.type === 'text') return (session.result as TextAnalysisResult).model_info.device_used;
    if (session.type === 'audio') return 'cpu/gpu';
    return 'gpu';
  }

  private formatDelta(num: number, suffix: string, reverseColors = false): string {
    if (num === 0) return 'Same';
    const sign = num > 0 ? '+' : '';
    return `${sign}${num % 1 !== 0 ? num.toFixed(2) : num}${suffix}`;
  }

  private getDateDiff(ds1: string, ds2: string): string {
    const d1 = new Date(ds1).getTime();
    const d2 = new Date(ds2).getTime();
    const diffHours = Math.abs(d2 - d1) / (1000 * 60 * 60);
    if (diffHours < 24) return `${diffHours.toFixed(1)} hrs apart`;
    return `${(diffHours / 24).toFixed(1)} days apart`;
  }

}
