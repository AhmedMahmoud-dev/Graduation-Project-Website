import { Component, input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EmotionIconComponent } from '../../../../shared/components/emotion-icon/emotion-icon.component';
import { AnalysisSession, AudioAnalysisSession, TextAnalysisResult } from '../../../../core/models/text-analysis.model';
import { inject } from '@angular/core';
import { FormattingService } from '../../../../core/services/formatting.service';

@Component({
  selector: 'app-compare-selection-panel',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './compare-selection-panel.component.html',
})
export class CompareSelectionPanelComponent {
  protected format = inject(FormattingService);
  /** The full analysis session object (null = empty state) */
  analysis = input<AnalysisSession | AudioAnalysisSession | null>(null);

  /** Whether the analysis is currently being loaded */
  loading = input<boolean>(false);

  /** Panel identifier label (e.g., 'A' or 'B') */
  panelLabel = input.required<string>();

  /** Emitted when the user clicks to open the picker */
  @Output() openPicker = new EventEmitter<void>();

  /** Emitted when the user clicks "Change Selection" */
  @Output() changeSelection = new EventEmitter<void>();

  // ─── Helpers ─────────────────────────────────────────────────────────


  getDominantLabel(session: any): string {
    if (!session) return 'neutral';
    if (session.type === 'text') {
      return (session.result as TextAnalysisResult).combined_final_emotion.label;
    }
    return session.result.final_multimodal_emotion.label;
  }

  getConfidence(session: any): number {
    if (!session) return 0;
    if (session.type === 'text') {
      return (session.result as TextAnalysisResult).combined_final_emotion.confidence_percent;
    }
    return session.result.final_multimodal_emotion.confidence_percent;
  }

  getExcerpt(session: any): string {
    if (!session) return 'Unknown input';
    let text = session.type === 'text' ? session.input : session.inputFileName;
    if (text?.length > 80) return text.substring(0, 80) + '...';
    return text || 'Unknown input';
  }

  onPanelClick() {
    if (!this.analysis() && !this.loading()) {
      this.openPicker.emit();
    }
  }

  onChangeClick(event: Event) {
    event.stopPropagation();
    this.openPicker.emit();
  }
}
