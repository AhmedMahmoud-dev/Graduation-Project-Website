import { Component, input, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AnalysisSession, AudioAnalysisSession, TextAnalysisResult } from '../../../core/models/text-analysis.model';
import { ColorSettingsService } from '../../../core/services/color-settings.service';
import { EmotionIconComponent } from '../../../shared/components/emotion-icon/emotion-icon.component';

interface DiffRow {
  index: number;
  isMatch: boolean;
  itemA: any | null;
  itemB: any | null;
}

@Component({
  selector: 'app-compare-diff',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './compare-diff.component.html',
  styleUrls: ['./compare-diff.component.css']
})
export class CompareDiffComponent {
  private colorSettings = inject(ColorSettingsService);

  analysisA = input.required<AnalysisSession | AudioAnalysisSession | null>();
  analysisB = input.required<AnalysisSession | AudioAnalysisSession | null>();

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
    if (session.type === 'text') {
      return (session.result as TextAnalysisResult).sentences_analysis || [];
    }
    return session.result.audio_emotion?.timeline || [];
  }

  getDominant(type: string, item: any): { label: string, confidence: number } {
    if (!item || !item.dominant) return { label: 'Neutral', confidence: 0 };
    return {
      label: item.dominant.label || 'Neutral',
      confidence: (item.dominant.confidence || 0) * 100
    };
  }

  getTop3(item: any): { label: string, val: number, color: string }[] {
    const probs = item?.probabilities || {};
    const colors = this.colorSettings.emotionColors();
    return Object.keys(probs)
      .map(k => ({ label: k, val: (probs[k] || 0) * 100, color: colors[k] || '#fff' }))
      .sort((a, b) => b.val - a.val)
      .slice(0, 3);
  }

  getText(type: string, item: any): string {
    if (!item) return 'Unknown Segment';
    if (type === 'text') {
      return item.sentence || 'No text found';
    }
    const offset = item.timestamp_offset !== undefined ? Number(item.timestamp_offset).toFixed(1) : '0.0';
    return `Audio Segment [${offset}s]`;
  }

  toggleExpand(index: number, side: 'a' | 'b') {
    if (this.isExpanded[index]) {
      this.isExpanded[index][side] = !this.isExpanded[index][side];
    }
  }

  getEmotionColor(label: string): string {
    return `var(--emotion-${label?.toLowerCase() || 'neutral'})`;
  }
}
