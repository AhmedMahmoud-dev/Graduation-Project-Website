import { signal, inject, effect, OnInit, Directive, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, ActivatedRoute } from '@angular/router';
import { Observable } from 'rxjs';

import { ChartThemeService } from '../../core/services/chart-theme.service';
import { AnalysisStorageService } from '../../core/services/analysis-storage.service';
import { ToastService } from '../../core/services/toast.service';
import { EmotionColorService } from '../../core/services/emotion-color.service';
import { AnalysisV2Service } from '../../core/services/analysis-v2.service';
import { AuthService } from '../../core/services/auth.service';
import { ApiResponse } from '../../core/models/api-response.model';
import { TimelineDataPoint, DistributionDataPoint } from '../../core/models/chart-data.model';
import { AnalysisOrchestrationService } from '../../core/services/analysis-orchestration.service';

export type AnalysisPageState = 'input' | 'loading' | 'results' | 'fetching';

/**
 * BaseAnalysisComponent — abstract base for all analysis feature pages.
 *
 * Centralizes the shared state-machine, route-param session loading,
 * cloud-sync flow, and chart-theme reactivity so that concrete
 * pages (text, audio, image, video …) only implement what is unique.
 */
@Directive()
export abstract class BaseAnalysisComponent<TResult, TSession = unknown> implements OnInit {

  // ─── Common Services ──────────────────────────────────────────────
  protected chartThemeService = inject(ChartThemeService);
  protected storageService = inject(AnalysisStorageService);
  protected route = inject(ActivatedRoute);
  protected router = inject(Router);
  protected toastService = inject(ToastService);
  protected analysisV2Service = inject(AnalysisV2Service);
  protected authService = inject(AuthService);
  colorService = inject(EmotionColorService);
  private destroyRef = inject(DestroyRef);
  protected orchestrationService = inject(AnalysisOrchestrationService);

  // ─── Common State ─────────────────────────────────────────────────
  state = signal<AnalysisPageState>('input');
  error = signal<string | null>(null);
  result = signal<TResult | null>(null);
  sessionId = signal<string>('');

  // ─── Chart Data ───────────────────────────────────────────────────
  timelineData = signal<TimelineDataPoint[]>([]);
  distributionData = signal<DistributionDataPoint[]>([]);

  // ─── Internal ─────────────────────────────────────────────────────
  protected shouldScrollToFeedback = false;

  // ─── Abstract Contract ────────────────────────────────────────────

  /** 'text' | 'audio' — used for storage key selection */
  protected abstract readonly analysisType: 'text' | 'audio';

  /** Route prefix e.g. '/analysis/text' */
  protected abstract readonly analysisRoute: string;

  /** Backend type string e.g. 'Text', 'Audio' */
  protected abstract readonly expectedApiType: string;

  /** Loading tips shown during analysis */
  abstract loadingTips: string[];

  /** Find a session in localStorage by id */
  protected abstract findLocalSession(id: string): TSession | null;

  /** Apply a loaded session to component state */
  protected abstract applySession(session: TSession): void;

  /** Persist a session to localStorage */
  protected abstract saveLocalSession(session: TSession): void;

  /** Build timeline & distribution data from result */
  protected abstract buildChartData(theme: Record<string, any>): void;

  /** Create the session object for localStorage */
  protected abstract buildSessionPayload(sid: string, result: TResult): TSession;

  /** Sync the analysis to the cloud backend */
  protected abstract syncToCloud(sid: string, result: TResult): Observable<ApiResponse<number>>;

  // ─── Constructor ──────────────────────────────────────────────────
  constructor() {
    // Capture navigation state for scrolling
    const navigation = this.router.getCurrentNavigation();
    if (navigation?.extras.state?.['scrollToFeedback']) {
      this.shouldScrollToFeedback = true;
    }

    // Re-build charts when theme changes and result exists
    effect(() => {
      const theme = this.chartThemeService.getChartTheme();
      if (this.result()) {
        this.buildChartData(theme);
      }
    });
  }

  // ─── Lifecycle ────────────────────────────────────────────────────
  ngOnInit() {
    this.onInit();
    this.subscribeToRouteParams();
  }

  /** Hook for subclass-specific init logic. Called at start of ngOnInit. */
  protected onInit(): void {}

  /** Hook called when route has no :id param. */
  protected onNoRouteId(): void {}

  /** Hook called after analysis success, before cloud sync. */
  protected onAnalysisSuccess(_sid: string, _result: TResult): void {}

  // ─── Route Param Handling ─────────────────────────────────────────
  private subscribeToRouteParams(): void {
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

  private loadSessionById(id: string): void {
    const localSession = this.findLocalSession(id);
    if (localSession) {
      this.applySession(localSession);
      this.consumeScrollToFeedback(150);
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
        this.consumeScrollToFeedback(300);
      },
      error: () => {
        this.toastService.show('Error', 'Failed to retrieve analysis report', 'error', 'error');
        this.router.navigate([this.analysisRoute]);
      }
    });
  }

  // ─── Analysis Execution ───────────────────────────────────────────

  /**
   * Executes the full analysis flow: loading → API call → save → charts → cloud sync.
   * Subclasses call this from their own startAnalysis() after any pre-checks.
   */
  protected executeAnalysisFlow(analysis$: Observable<TResult>): void {
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
        this.router.navigate([this.analysisRoute, sid], { replaceUrl: true });

        // Hook for subclass-specific post-success logic
        this.onAnalysisSuccess(sid, res);

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

  scrollToFeedback(): void {
    const el = document.getElementById('feedback-section');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  protected consumeScrollToFeedback(delayMs: number): void {
    if (this.shouldScrollToFeedback) {
      this.shouldScrollToFeedback = false;
      setTimeout(() => this.scrollToFeedback(), delayMs);
    }
  }
}
