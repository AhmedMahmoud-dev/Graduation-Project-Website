import { Component, signal, computed, effect, inject, OnInit, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { AnalysisSession, AudioAnalysisSession } from '../../../core/models/text-analysis.model';
import { ImageAnalysisSession } from '../../../core/models/image-analysis.model';
import { VideoAnalysisSession } from '../../../core/models/video-analysis.model';
import { AnalysisHistoryItem, AnalysisDetails } from '../../../core/models/analysis-v2.model';
import { AnalysisStorageService } from '../../../core/services/analysis-storage.service';
import { AnalysisV2Service } from '../../../core/services/analysis-v2.service';
import { CompareSelectorComponent } from '../compare-selector/compare-selector.component';
import { CompareHeroComponent } from '../compare-hero/compare-hero.component';
import { CompareTimelineComponent } from '../compare-timeline/compare-timeline.component';
import { CompareDistributionComponent } from '../compare-distribution/compare-distribution.component';
import { CompareDiffComponent } from '../compare-diff/compare-diff.component';
import { CompareStatsComponent } from '../compare-stats/compare-stats.component';
import { AppNavbarComponent } from "../../../layouts/app-layout/app-navbar/app-navbar.component";
import { FooterSectionComponent } from "../../../shared/components/footer/footer.component";
import { ToastService } from '../../../core/services/toast.service';
import { PageHeaderComponent } from '../../../shared/components/layout/page-header/page-header.component';

/** sessionStorage key for persisting compare selections across reloads */
const COMPARE_STATE_KEY = 'emotra_compare_state';

interface ComparePersistedState {
  type: 'text' | 'audio' | 'image' | 'video';
  idA: string | null;
  idB: string | null;
  dbIdA: number | null;
  dbIdB: number | null;
}

@Component({
  selector: 'app-compare',
  standalone: true,
  imports: [
    CompareSelectorComponent,
    CompareHeroComponent,
    CompareTimelineComponent,
    CompareDistributionComponent,
    CompareDiffComponent,
    CompareStatsComponent,
    FooterSectionComponent,
    PageHeaderComponent
  ],
  templateUrl: './compare.component.html',
  styleUrls: ['./compare.component.css']
})
export class CompareComponent implements OnInit {
  private toast = inject(ToastService);
  private storageService = inject(AnalysisStorageService);
  private analysisV2Service = inject(AnalysisV2Service);
  private destroyRef = inject(DestroyRef);
  private firstLoadDone = false;

  // Global Comparison State
  compareType = signal<'text' | 'audio' | 'image' | 'video'>('text');

  // Selected Analyses (full session objects with .result)
  analysisA = signal<AnalysisSession | AudioAnalysisSession | ImageAnalysisSession | VideoAnalysisSession | null>(null);
  analysisB = signal<AnalysisSession | AudioAnalysisSession | ImageAnalysisSession | VideoAnalysisSession | null>(null);

  // Loading states for each slot
  loadingA = signal(false);
  loadingB = signal(false);

  // Computed state
  isComparisonReady = computed(() => !!this.analysisA() && !!this.analysisB());

  constructor() {
    // Notify when first ready
    effect(() => {
      if (this.isComparisonReady() && !this.firstLoadDone) {
        this.toast.show('Comparison ready', 'Showing emotional diff between your two analyses', 'success', 'check');
        this.firstLoadDone = true;
      }
    });
  }

  ngOnInit() {
    this.rehydrateFromSession();
  }

  onTypeChange(newType: 'text' | 'audio' | 'image' | 'video') {
    if (this.compareType() !== newType) {
      this.compareType.set(newType);
      this.analysisA.set(null);
      this.analysisB.set(null);
      this.loadingA.set(false);
      this.loadingB.set(false);
      this.firstLoadDone = false;
      this.persistState();
    }
  }

  /** Called when user selects an item from the history meta list for slot A */
  onSelectA(meta: AnalysisHistoryItem) {
    this.resolveSession(
      meta.client_id,
      meta.id,
      meta.type.toLowerCase() as 'text' | 'audio' | 'image' | 'video',
      'A',
      true
    );
  }

  /** Called when user selects an item from the history meta list for slot B */
  onSelectB(meta: AnalysisHistoryItem) {
    this.resolveSession(
      meta.client_id,
      meta.id,
      meta.type.toLowerCase() as 'text' | 'audio' | 'image' | 'video',
      'B',
      true
    );
  }

  // ─── SESSION RESOLUTION ────────────────────────────────────────────────────

  /**
   * Resolves a full session object from localStorage or API fallback.
   * 1. Try localStorage by client_id
   * 2. Try localStorage by cloudId (numeric DB id)
   * 3. Fall back to API → save to localStorage → use
   */
  private resolveSession(
    clientId: string,
    dbId: number,
    type: 'text' | 'audio' | 'image' | 'video',
    slot: 'A' | 'B',
    showToast: boolean
  ): void {
    const sessionSignal = slot === 'A' ? this.analysisA : this.analysisB;
    const loadingSignal = slot === 'A' ? this.loadingA : this.loadingB;

    // 1. Try localStorage lookup
    let found: AnalysisSession | AudioAnalysisSession | ImageAnalysisSession | VideoAnalysisSession | null = null;

    if (type === 'text') {
      found = this.storageService.getSessionById(clientId)
        ?? this.storageService.getSessions().find(s => s.cloudId === dbId)
        ?? null;
    } else if (type === 'audio') {
      found = this.storageService.getAudioSessionById(clientId)
        ?? this.storageService.getAudioSessions().find(s => s.cloudId === dbId)
        ?? null;
    } else if (type === 'image') {
      found = this.storageService.getImageSessionById(clientId)
        ?? this.storageService.getImageSessions().find(s => s.cloudId === dbId)
        ?? null;
    } else if (type === 'video') {
      found = this.storageService.getVideoSessionById(clientId)
        ?? this.storageService.getVideoSessions().find(s => s.cloudId === dbId)
        ?? null;
    }

    if (found) {
      const isUpdating = this.isComparisonReady();
      sessionSignal.set({ ...found });
      if (showToast && isUpdating) {
        this.toast.show('Comparison updated', `Analysis ${slot} has been changed`, 'info', 'refresh');
      }
      this.persistState();
      return;
    }

    // 2. API fallback
    loadingSignal.set(true);

    this.analysisV2Service.getAnalysisDetails(clientId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
      next: (res) => {
        if (res.is_success && res.data) {
          const session = this.buildSessionFromApi(res.data, type);

          // Save to localStorage with duplicate prevention (handled by storage service)
          if (type === 'text') {
            this.storageService.saveSession(session as AnalysisSession);
          } else if (type === 'audio') {
            this.storageService.saveAudioSession(session as AudioAnalysisSession);
          } else if (type === 'image') {
            this.storageService.saveImageSession(session as ImageAnalysisSession);
          } else if (type === 'video') {
            this.storageService.saveVideoSession(session as VideoAnalysisSession);
          }

          const isUpdating = this.isComparisonReady();
          sessionSignal.set(session);
          if (showToast && isUpdating) {
            this.toast.show('Comparison updated', `Analysis ${slot} has been changed`, 'info', 'refresh');
          }
          this.persistState();
        } else {
          if (showToast) {
            this.toast.show('Error', 'Could not load analysis details', 'error', 'error');
          }
          sessionSignal.set(null);
        }
        loadingSignal.set(false);
      },
      error: () => {
        if (showToast) {
          this.toast.show('Error', 'Failed to retrieve analysis details', 'error', 'error');
        }
        sessionSignal.set(null);
        loadingSignal.set(false);
      }
    });
  }

  /** Construct a full session from API response */
  private buildSessionFromApi(
    data: AnalysisDetails,
    type: 'text' | 'audio' | 'image' | 'video'
  ): AnalysisSession | AudioAnalysisSession | ImageAnalysisSession | VideoAnalysisSession {
    return this.analysisV2Service.mapDetailsToSession(data);
  }

  // ─── SESSION PERSISTENCE ───────────────────────────────────────────────────

  /** Save type and both IDs (client + numeric) for reload rehydration */
  private persistState(): void {
    try {
      const a = this.analysisA();
      const b = this.analysisB();
      const state: ComparePersistedState = {
        type: this.compareType(),
        idA: a?.id ?? null,
        idB: b?.id ?? null,
        dbIdA: (a as any)?.cloudId ?? null,
        dbIdB: (b as any)?.cloudId ?? null
      };
      sessionStorage.setItem(COMPARE_STATE_KEY, JSON.stringify(state));
    } catch (e) { }
  }

  /** Rehydrate compare selections from sessionStorage on page reload */
  private rehydrateFromSession(): void {
    try {
      const raw = sessionStorage.getItem(COMPARE_STATE_KEY);
      if (!raw) return;

      const saved: ComparePersistedState = JSON.parse(raw);
      if (!saved.type || (!saved.idA && !saved.idB)) return;

      this.compareType.set(saved.type);

      if (saved.idA && saved.dbIdA) {
        this.resolveSession(saved.idA, saved.dbIdA, saved.type, 'A', false);
      }
      if (saved.idB && saved.dbIdB) {
        this.resolveSession(saved.idB, saved.dbIdB, saved.type, 'B', false);
      }
      this.firstLoadDone = true; // Prevents the generic comparison ready toast on reload
    } catch (e) { }
  }
}
