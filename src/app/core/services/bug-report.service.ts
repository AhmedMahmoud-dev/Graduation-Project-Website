import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/api-response.model';
import { ErrorHandlerService } from './error-handler.service';

export interface BugReportPayload {
  title: string;
  description: string;
  category: string;
  priority: string;
  metadata?: Record<string, string>;
}

@Injectable({
  providedIn: 'root'
})
export class BugReportService {
  private http = inject(HttpClient);
  private errorHandler = inject(ErrorHandlerService);

  /**
   * POST /api/support/bug-report
   * Submits a bug report. Requires Bearer token (handled by interceptor).
   */
  submit(payload: BugReportPayload): Observable<ApiResponse<number>> {
    const url = `${environment.apiUrl}/api/support/bug-report`;
    return this.http.post<ApiResponse<number>>(url, payload).pipe(
      catchError(err => {
        const message = this.errorHandler.handleError(err);
        return throwError(() => ({ message }));
      })
    );
  }
}
