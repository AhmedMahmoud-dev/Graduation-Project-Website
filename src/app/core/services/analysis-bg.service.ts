import { Injectable, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { ToastService } from './toast.service';
import { NotificationSettingsService } from './notification-settings.service';
import { Observable, Subscription } from 'rxjs';

export interface PendingAnalysisJob {
  id: string; // client_id (UUID)
  startedAt: number; // timestamp
  label: string;
  type: string;
}

@Injectable({
  providedIn: 'root'
})
export class AnalysisBgService {
  private readonly STORAGE_KEY = 'emotra_pending_analysis_job';
  private toastService = inject(ToastService);
  private router = inject(Router);
  private settingsService = inject(NotificationSettingsService);
  
  isProcessing = signal<boolean>(false);
  currentJob = signal<PendingAnalysisJob | null>(null);
  jobResult = signal<{ id: string, result: unknown } | null>(null);
  jobError = signal<any>(null);
  
  private timeoutDuration = 10 * 60 * 1000; // 10 minutes
  private currentSubscription?: Subscription;

  constructor() {}

  checkPendingJobOnInit(): void {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      if (raw) {
        const job: PendingAnalysisJob = JSON.parse(raw);
        const now = Date.now();
        const typeName = job.type.charAt(0).toUpperCase() + job.type.slice(1);
        
        if (now - job.startedAt > this.timeoutDuration) {
          localStorage.removeItem(this.STORAGE_KEY);
          this.toastService.show('Analysis Failed', `${typeName} analysis for ${job.label} timed out.`, 'error', 'error');
        } else {
          this.isProcessing.set(true);
          this.currentJob.set(job);
          
          if (!this.currentSubscription) {
             // Request died due to refresh
             this.clearJob();
             this.toastService.show('Analysis Aborted', `${typeName} analysis for ${job.label} was interrupted by page reload.`, 'warning', 'warning');
          }
        }
      }
    } catch (e) {
      localStorage.removeItem(this.STORAGE_KEY);
    }
  }

  startBackgroundJob<T>(
    config: {
      label: string;           // e.g. filename or input description
      type: string;            // 'audio' | 'image' | 'video'
      resultRoute: string;     // e.g. '/analysis/audio'
      analysis$: Observable<T>;
      onSuccess: (result: T, jobId: string) => void; // caller handles save + sync
    }
  ): void {
    const sid = crypto.randomUUID();
    const job: PendingAnalysisJob = { id: sid, startedAt: Date.now(), label: config.label, type: config.type };
    const typeName = config.type.charAt(0).toUpperCase() + config.type.slice(1);
    
    this.currentJob.set(job);
    this.isProcessing.set(true);
    this.jobResult.set(null);
    this.jobError.set(null);
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(job));

    const baseDuration = this.settingsService.settings().toastDuration || 5000;

    // Show start toast
    this.toastService.confirm('Analysis Started', `${typeName} processing for ${config.label} is running in the background.`, () => {
      this.router.navigate(['/dashboard']);
    }, {
      icon: 'info',
      type: 'info',
      confirmLabel: 'Continue Browsing',
      cancelLabel: 'Stay',
      disableBackdropClose: true,
      duration: baseDuration + 10000,
      forceOverride: true
    });

    this.currentSubscription = config.analysis$.subscribe({
      next: (res) => {
        // Complete the job
        this.jobResult.set({ id: sid, result: res });
        
        // Execute caller-provided success handler
        config.onSuccess(res, sid);

        // Delay toast slightly to give component time to route if they stayed
        setTimeout(() => {
            if (!this.router.url.includes(`${config.resultRoute}/${sid}`)) {
              this.toastService.confirm('Analysis Complete', `${typeName} analysis for ${config.label} is ready.`, () => {
                this.router.navigate([config.resultRoute, sid]);
              }, {
                icon: 'check',
                type: 'success',
                confirmLabel: 'View Results',
                cancelLabel: 'Dismiss',
                disableBackdropClose: true,
                duration: baseDuration + 10000,
                forceOverride: true
              });
            }
        }, 100);
        
        this.clearJob();
      },
      error: (err) => {
        this.jobError.set(err);
        this.clearJob();
        this.toastService.show('Analysis Failed', `Could not analyze ${config.label}.`, 'error', 'error');
      }
    });
  }

  private clearJob() {
    this.isProcessing.set(false);
    this.currentJob.set(null);
    localStorage.removeItem(this.STORAGE_KEY);
    this.currentSubscription = undefined;
  }
}
