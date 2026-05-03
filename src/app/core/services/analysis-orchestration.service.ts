import { Injectable, inject } from '@angular/core';
import { Observable, catchError, throwError, map } from 'rxjs';
import { AnalysisV2Service } from './analysis-v2.service';
import { AnalysisStorageService } from './analysis-storage.service';
import { AuthService } from './auth.service';
import { ToastService } from './toast.service';
import { ApiResponse } from '../models/api-response.model';

@Injectable({ providedIn: 'root' })
export class AnalysisOrchestrationService {
  private api = inject(AnalysisV2Service);
  private storage = inject(AnalysisStorageService);
  private auth = inject(AuthService);
  private toast = inject(ToastService);

  /**
   * Fetches an analysis session from the API, maps it, and saves it locally.
   */
  fetchAndSaveSession<T>(id: string, expectedType: string, saveCallback: (session: T) => void): Observable<T> {
    return this.api.getAnalysisDetails(id).pipe(
      map(res => {
        if (res.is_success && res.data && res.data.type === expectedType) {
          const session = this.api.mapDetailsToSession(res.data) as unknown as T;
          saveCallback(session);
          return session;
        }
        throw new Error('Analysis not found or type mismatch');
      })
    );
  }

  /**
   * Syncs a completed analysis to the cloud, updating local storage with the cloud ID.
   * Does NOT delete the local session if the sync fails.
   */
  syncSessionToCloud<TResult>(
    sid: string,
    result: TResult,
    analysisType: 'text' | 'audio',
    syncCallback: (sid: string, res: TResult) => Observable<ApiResponse<number>>
  ): void {
    if (!this.auth.isAuthenticated()) return;

    syncCallback(sid, result).subscribe({
      next: (apiRes) => {
        if (apiRes.is_success && apiRes.data != null) {
          this.storage.markAsSynced(sid, apiRes.data, analysisType);
        } else {
          this.toast.show('Save Failed', 'Analysis could not be saved to cloud.', 'error', 'error');
        }
      },
      error: () => {
        this.toast.show('Save Failed', 'Analysis could not be saved to cloud.', 'error', 'error');
      }
    });
  }
}
