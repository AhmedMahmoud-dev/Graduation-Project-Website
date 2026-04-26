import { Component, input, Output, EventEmitter, signal, computed, inject, effect, untracked, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AnalysisSession, AudioAnalysisSession, TextAnalysisResult } from '../../../core/models/text-analysis.model';
import { AnalysisHistoryItem, AnalysisType } from '../../../core/models/analysis-v2.model';
import { EmotionIconComponent } from '../../../shared/components/emotion-icon/emotion-icon.component';
import { SegmentedNavComponent } from '../../../shared/components/segmented-nav/segmented-nav.component';
import { AnalysisV2Service } from '../../../core/services/analysis-v2.service';

@Component({
  selector: 'app-compare-selector',
  standalone: true,
  imports: [CommonModule, EmotionIconComponent, SegmentedNavComponent],
  templateUrl: './compare-selector.component.html',
  styleUrls: ['./compare-selector.component.css']
})
export class CompareSelectorComponent implements OnDestroy {
  private analysisV2Service = inject(AnalysisV2Service);

  navOptions = [
    { label: 'Text', value: 'text' },
    { label: 'Audio', value: 'audio' }
  ];

  type = input<'text' | 'audio'>('text');
  analysisA = input<AnalysisSession | AudioAnalysisSession | null>(null);
  analysisB = input<AnalysisSession | AudioAnalysisSession | null>(null);
  loadingA = input<boolean>(false);
  loadingB = input<boolean>(false);

  @Output() typeChange = new EventEmitter<'text' | 'audio'>();
  @Output() selectA = new EventEmitter<AnalysisHistoryItem>();
  @Output() selectB = new EventEmitter<AnalysisHistoryItem>();

  // Modal State
  isModalOpen = signal(false);
  selectingFor = signal<'A' | 'B' | null>(null);

  private _internalHistory = signal<AnalysisHistoryItem[]>([]);
  private _lastFetchTime: Record<string, number> = {};
  isHistoryLoading = signal(false);

  constructor() {
    // Sync internal signal with cache initially
    effect(() => {
      const currentType = this.type();
      untracked(() => {
        this.loadHistoryFromCache(currentType);
      });
    }, {});

    // Scroll Lock Logic
    effect(() => {
      const isOpen = this.isModalOpen();
      if (isOpen) {
        document.body.style.overflow = 'hidden';
      } else {
        document.body.style.overflow = '';
      }
    });
  }

  private loadHistoryFromCache(type: 'text' | 'audio') {
    const key = type === 'text' ? 'emotra_history_meta_text' : 'emotra_history_meta_audio';
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        this._internalHistory.set((parsed.data || []) as AnalysisHistoryItem[]);
      } else {
        this._internalHistory.set([]);
      }
      
      // Background sync
      this.fetchTypeHistory(type);
    } catch (e) {
      this._internalHistory.set([]);
      this.fetchTypeHistory(type);
    }
  }

  private fetchTypeHistory(type: 'text' | 'audio') {
    // Avoid redundant calls if already loading
    if (this.isHistoryLoading()) return;

    // "Do it good" logic: Avoid repetitive "Syncing..." if we fetched very recently (e.g. 15s)
    // This fulfills the "Always Up to Date" requirement without being annoying.
    const now = Date.now();
    const lastFetch = this._lastFetchTime[type] || 0;
    if (now - lastFetch < 15000) return; 

    this.isHistoryLoading.set(true);
    const capitalizedType = (type.charAt(0).toUpperCase() + type.slice(1)) as AnalysisType;

    this.analysisV2Service.getHistory(1, 20, capitalizedType).subscribe({
      next: (res) => {
        if (res.is_success && res.data) {
          const key = type === 'text' ? 'emotra_history_meta_text' : 'emotra_history_meta_audio';
          localStorage.setItem(key, JSON.stringify({ data: res.data, total: res.total }));

          this._lastFetchTime[type] = Date.now();

          // Only update if we are still on that type
          if (this.type() === type) {
            this._internalHistory.set(res.data);
          }
        }
        this.isHistoryLoading.set(false);
      },
      error: () => this.isHistoryLoading.set(false)
    });
  }

  // Available History — reads from localStorage meta cache
  availableHistory = computed(() => this._internalHistory());

  // ─── Panel helpers (work with full session objects from inputs) ─────────────

  getEmotionColor(label: string): string {
    return `var(--emotion-${label?.toLowerCase() || 'neutral'})`;
  }

  getDominantLabel(session: any): string {
    if (session.type === 'text') {
      return (session.result as TextAnalysisResult).combined_final_emotion.label;
    }
    return session.result.final_multimodal_emotion.label;
  }

  getConfidence(session: any): number {
    if (session.type === 'text') {
      return (session.result as TextAnalysisResult).combined_final_emotion.confidence_percent;
    }
    return session.result.final_multimodal_emotion.confidence_percent;
  }

  getExcerpt(session: any): string {
    let text = session.type === 'text' ? session.input : session.inputFileName;
    if (text?.length > 80) return text.substring(0, 80) + '...';
    return text || 'Unknown input';
  }

  // ─── Modal list helpers (work with AnalysisHistoryItem meta) ───────────────

  getMetaExcerpt(item: AnalysisHistoryItem): string {
    const text = item.summary_text;
    if (text?.length > 80) return text.substring(0, 80) + '...';
    return text || 'Unknown input';
  }

  // ─── Modal actions ─────────────────────────────────────────────────────────

  openPicker(panel: 'A' | 'B') {
    this.selectingFor.set(panel);
    this.isModalOpen.set(true);
    // Refresh history whenever modal opens to guarantee it's up to date
    this.fetchTypeHistory(this.type());
  }

  closeModal() {
    this.isModalOpen.set(false);
    setTimeout(() => this.selectingFor.set(null), 300);
  }

  selectAnalysis(item: AnalysisHistoryItem) {
    if (this.isAlreadySelected(item.client_id)) return;

    if (this.selectingFor() === 'A') {
      this.selectA.emit(item);
    } else if (this.selectingFor() === 'B') {
      this.selectB.emit(item);
    }
    this.closeModal();
  }

  isAlreadySelected(clientId: string): boolean {
    return this.analysisA()?.id === clientId || this.analysisB()?.id === clientId;
  }

  ngOnDestroy(): void {
    document.body.style.overflow = '';
  }
}
