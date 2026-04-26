import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/api-response.model';
import { AlertItem, AlertStats, AlertsPagedResult } from '../models/alert.model';

@Injectable({
  providedIn: 'root'
})
export class AlertService {
  private http = inject(HttpClient);

  /**
   * Retrieves a paginated list of alerts.
   */
  getAlerts(page: number, pageSize: number, severity?: string, resolved?: boolean): Observable<ApiResponse<AlertsPagedResult>> {
    let url = `${environment.apiUrl}/api/alerts?page=${page}&pageSize=${pageSize}`;
    if (severity) url += `&severity=${severity}`;
    if (resolved !== undefined) url += `&resolved=${resolved}`;
    
    return this.http.get<ApiResponse<AlertsPagedResult>>(url);
  }

  /**
   * Retrieves summary statistics for alerts.
   */
  getStats(): Observable<ApiResponse<AlertStats>> {
    const url = `${environment.apiUrl}/api/alerts/stats`;
    return this.http.get<ApiResponse<AlertStats>>(url);
  }

  /**
   * Marks a specific alert as resolved.
   */
  resolveAlert(id: number): Observable<ApiResponse<AlertItem>> {
    const url = `${environment.apiUrl}/api/alerts/${id}/resolve`;
    return this.http.patch<ApiResponse<AlertItem>>(url, {});
  }

  /**
   * Permanently deletes an alert.
   */
  deleteAlert(id: number): Observable<ApiResponse<boolean>> {
    const url = `${environment.apiUrl}/api/alerts/${id}`;
    return this.http.delete<ApiResponse<boolean>>(url);
  }
}
