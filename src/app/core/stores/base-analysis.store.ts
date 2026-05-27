import { signal, inject, effect, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, ActivatedRoute } from '@angular/router';
import { Observable } from 'rxjs';

import { ChartThemeService } from '../services/chart-theme.service';
import { ToastService } from '../services/toast.service';
import { EmotionColorService } from '../services/emotion-color.service';
import { AuthService } from '../services/auth.service';
import { ApiResponse } from '../models/api-response.model';
import { TimelineDataPoint, DistributionDataPoint } from '../models/chart-data.model';
import { AnalysisOrchestrationService } from '../services/analysis-orchestration.service';

export type AnalysisPageState = 'input' | 'loading' | 'results' | 'fetching';

/**
 * BaseAnalysisStore — abstract store for analysis feature pages.
 *
 * Encapsulates the shared state-machine, route-param session loading,
 * cloud-sync flow, and chart-theme reactivity using Angular Signals.
 * Cleanly decoupled from DOM operations to support non-routing/non-DOM contexts.
 */
export abstract class BaseAnalysisStore<TResult, TSession = unknown> {
  // ─── Common Services ──────────────────────────────────────────────
  protected chartThemeService = inject(ChartThemeService);
  protected route = inject(ActivatedRoute, { optional: true });
  protected router = inject(Router, { optional: true });
  protected toastService = inject(ToastService);
  protected authService = inject(AuthService);
  colorService = inject(EmotionColorService);
  protected destroyRef = inject(DestroyRef);
  protected orchestrationService = inject(AnalysisOrchestrationService);

  // ─── Common State ─────────────────────────────────────────────────
  state = signal<AnalysisPageState>('input');
  error = signal<string | null>(null);
  result = signal<TResult | null>(null);
  sessionId = signal<string>('');

  // ─── Chart Data ───────────────────────────────────────────────────
  timelineData = signal<TimelineDataPoint[]>([]);
  distributionData = signal<DistributionDataPoint[]>([]);

  // ─── UI Signals ───────────────────────────────────────────────────
  shouldScrollToFeedback = signal<boolean>(false);
  private hasPendingScrollRequest = false;

  // ─── Abstract Config Hooks ────────────────────────────────────────
  protected abstract readonly analysisType: 'text' | 'audio' | 'image' | 'video';
  protected abstract readonly analysisRoute: string;
  protected abstract readonly expectedApiType: string;

  protected abstract findLocalSession(id: string): TSession | null;
  protected abstract applySession(session: TSession): void;
  protected abstract saveLocalSession(session: TSession): void;
  protected abstract buildChartData(theme: Record<string, any>): void;
  protected abstract buildSessionPayload(sid: string, result: TResult): TSession;
  protected abstract syncToCloud(sid: string, result: TResult): Observable<ApiResponse<number>>;

  constructor() {
    // Capture navigation state for scrolling
    if (this.router?.getCurrentNavigation) {
      const navigation = this.router.getCurrentNavigation();
      if (navigation?.extras?.state?.['scrollToFeedback']) {
        this.hasPendingScrollRequest = true;
      }
    }

    // Re-build charts when theme changes and result exists
    effect(() => {
      const theme = this.chartThemeService.getChartTheme();
      if (this.result()) {
        this.buildChartData(theme);
      }
    });
  }

  // ─── Route Param Handling ─────────────────────────────────────────
  subscribeToRouteParams(): void {
    if (!this.route) return;
    this.route.params
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(params => {
        const id = params['id'];
        if (id) {
          this.loadSessionById(id);
        } else {
          this.onNoRouteId();
        }
      });
  }

  protected onNoRouteId(): void {
    if (this.state() === 'results') {
      this.resetToInput(false);
    }
  }

  loadSessionById(id: string): void {
    const localSession = this.findLocalSession(id);
    if (localSession) {
      this.applySession(localSession);
      this.consumeScrollToFeedback();
    } else {
      this.fetchFromApi(id);
    }
  }

  private fetchFromApi(id: string): void {
    this.state.set('fetching');
    this.orchestrationService.fetchAndSaveSession<TSession>(
      id,
      this.expectedApiType,
      (session) => this.saveLocalSession(session)
    )
    .pipe(takeUntilDestroyed(this.destroyRef))
    .subscribe({
      next: (fetchedSession) => {
        this.applySession(fetchedSession);
        this.consumeScrollToFeedback();
      },
      error: () => {
        this.toastService.show('Error', 'Failed to retrieve analysis report', 'error', 'error');
        if (this.router) {
          this.router.navigate([this.analysisRoute]);
        }
      }
    });
  }

  private consumeScrollToFeedback(): void {
    if (this.hasPendingScrollRequest) {
      this.hasPendingScrollRequest = false;
      this.shouldScrollToFeedback.set(true);
    }
  }

  // ─── Analysis Execution ───────────────────────────────────────────
  protected executeAnalysisFlow(analysis$: Observable<TResult>, onAnalysisSuccess?: (sid: string, result: TResult) => void): void {
    this.state.set('loading');
    this.error.set(null);

    analysis$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.result.set(res);
          const sid = crypto.randomUUID();
          this.sessionId.set(sid);

          const session = this.buildSessionPayload(sid, res);
          this.saveLocalSession(session);

          this.buildChartData(this.chartThemeService.getChartTheme());
          this.state.set('results');
          if (this.router) {
            this.router.navigate([this.analysisRoute, sid], { replaceUrl: true });
          }

          if (onAnalysisSuccess) {
            onAnalysisSuccess(sid, res);
          }

          // Background cloud sync
          this.orchestrationService.syncSessionToCloud(
            sid,
            res,
            this.analysisType,
            (sid, res) => this.syncToCloud(sid, res)
          );
        },
        error: (err) => {
          console.error(err);
          const msg = 'Something went wrong. Please try again later.';
          this.error.set(msg);
          this.toastService.show('Analysis Failed', msg, 'error');
          this.state.set('input');
        }
      });
  }

  // ─── Utilities ────────────────────────────────────────────────────
  resetToInput(navigate = true) {
    this.state.set('input');
    this.result.set(null);
    if (navigate && this.router) {
      this.router.navigate([this.analysisRoute]);
    }
  }
}
