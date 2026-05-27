import { Component, input, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AnalysisSession, AudioAnalysisSession, TextAnalysisResult } from '../../../core/models/text-analysis.model';
import { ImageAnalysisSession } from '../../../core/models/image-analysis.model';
import { VideoAnalysisSession } from '../../../core/models/video-analysis.model';
import { ColorSettingsService } from '../../../core/services/color-settings.service';
import { EmotionIconComponent } from '../../../shared/components/emotion-icon/emotion-icon.component';
import { FormattingService } from '../../../core/services/formatting.service';
import { AnalysisSectionHeaderComponent } from '../../../shared/components/analysis-section-header/analysis-section-header.component';


interface DiffRow {
  index: number;
  isMatch: boolean;
  itemA: any | null;
  itemB: any | null;
}

@Component({
  selector: 'app-compare-diff',
  standalone: true,
  imports: [CommonModule, AnalysisSectionHeaderComponent],

  templateUrl: './compare-diff.component.html',
  styleUrls: ['./compare-diff.component.css']
})
export class CompareDiffComponent {
  private colorSettings = inject(ColorSettingsService);
  protected format = inject(FormattingService);

  analysisA = input.required<AnalysisSession | AudioAnalysisSession | ImageAnalysisSession | VideoAnalysisSession | null>();
  analysisB = input.required<AnalysisSession | AudioAnalysisSession | ImageAnalysisSession | VideoAnalysisSession | null>();
  target = input<string>('overall');

  isExpanded: Record<number, { a: boolean, b: boolean }> = {};

  diffRows = computed(() => {
    if (!this.analysisA() || !this.analysisB()) return [];

    const listA = this.getList(this.analysisA());
    const listB = this.getList(this.analysisB());
    const maxLength = Math.max(listA.length, listB.length);

    const rows: DiffRow[] = [];
    for (let i = 0; i < maxLength; i++) {
      const itemA = listA[i] || null;
      const itemB = listB[i] || null;

      let isMatch = false;
      if (itemA && itemB) {
        const domA = this.getDominant(this.analysisA()!.type, itemA);
        const domB = this.getDominant(this.analysisB()!.type, itemB);
        isMatch = domA.label === domB.label;
      } else {
        // if one is null, it's not a match, just an addition/deletion
        isMatch = false;
      }

      // Initialize expand state
      this.isExpanded[i] = { a: false, b: false };

      rows.push({ index: i, itemA, itemB, isMatch });
    }
    return rows;
  });

  private getList(session: any): any[] {
    if (!session || !session.result) return [];
    const target = this.target();

    if (session.type === 'text') {
      return (session.result as TextAnalysisResult).sentences_analysis || [];
    } else if (session.type === 'audio') {
      return session.result.audio_emotion?.timeline || [];
    } else if (session.type === 'image' || session.type === 'video') {
      if (target === 'overall') {
        return session.result.faces || [];
      } else {
        const faceIdx = parseInt(target.split('_')[1]);
        const face = session.result.faces?.[faceIdx];
        if (session.type === 'video' && face) {
          return face.timeline || [];
        }
        return face ? [face] : [];
      }
    }
    return [];
  }

  getDominant(type: string, item: any): { label: string, confidence: number } {
    if (!item) return { label: 'Neutral', confidence: 0 };
    if (type === 'text' || type === 'audio') {
      if (!item.dominant) return { label: 'Neutral', confidence: 0 };
      return {
        label: item.dominant.label || 'Neutral',
        confidence: (item.dominant.confidence || 0) * 100
      };
    } else {
      // Image/Video Face OR Video Frame Analysis
      const dom = item.combined_final_emotion || item.dominant;
      if (!dom) return { label: 'Neutral', confidence: 0 };
      return {
        label: dom.label || 'Neutral',
        confidence: dom.confidence_percent || (dom.confidence * 100) || 0
      };
    }
  }

  getTop3(item: any): { label: string, val: number, color: string }[] {
    const probsRaw = item?.probabilities || {};
    // For Image/Video faces, probabilities are in combined_results array
    const probs: Record<string, number> = {};
    if (item?.combined_results && Array.isArray(item.combined_results)) {
      item.combined_results.forEach((r: any) => {
        probs[r.label.toLowerCase()] = r.confidence;
      });
    } else {
      Object.assign(probs, probsRaw);
    }

    const colors = this.colorSettings.emotionColors();
    return Object.keys(probs)
      .map(k => ({ label: k, val: (probs[k] || 0) * 100, color: colors[k] || '#fff' }))
      .sort((a, b) => b.val - a.val)
      .slice(0, 3);
  }

  getText(type: string, item: any): string {
    if (!item) return 'Unknown Segment';
    const target = this.target();

    if (type === 'text') {
      return item.sentence || 'No text found';
    } else if (type === 'audio') {
      const offset = item.timestamp_offset !== undefined ? Number(item.timestamp_offset).toFixed(1) : '0.0';
      return `Audio Segment [${offset}s]`;
    } else if (type === 'image') {
      return target === 'overall' ? `Face #${item.face_id} Detected` : `Static Face Analysis`;
    } else if (type === 'video') {
      if (target === 'overall') {
        return `Track #${item.track_id} [${item.frames_seen} frames]`;
      } else {
        return `Frame ${item.frame_index} [${item.timestamp_sec?.toFixed(1)}s]`;
      }
    }
    return 'Unknown Segment';
  }

  toggleExpand(index: number, side: 'a' | 'b') {
    if (this.isExpanded[index]) {
      this.isExpanded[index][side] = !this.isExpanded[index][side];
    }
  }

}
