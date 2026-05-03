import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AdminSupportReplyRequest, AdminSupportListResponse, AdminSupportReplyResponse } from '../models/support.model';
import { ApiResponse } from '../models/api-response.model';

@Injectable({
  providedIn: 'root'
})
export class AdminSupportService {
  private http = inject(HttpClient);

  /**
   * Retrieves the support queue for administrators.
   */
  getMessages(page: number = 1, pageSize: number = 10, status?: string): Observable<ApiResponse<AdminSupportListResponse>> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('pageSize', pageSize.toString());

    if (status) {
      params = params.set('status', status);
    }

    return this.http.get<ApiResponse<AdminSupportListResponse>>(`${environment.apiUrl}/api/admin/support`, { params });
  }

  /**
   * Sends a reply to a support message.
   */
  replyToMessage(id: number, request: AdminSupportReplyRequest): Observable<ApiResponse<AdminSupportReplyResponse>> {
    return this.http.post<ApiResponse<AdminSupportReplyResponse>>(`${environment.apiUrl}/api/admin/support/${id}/reply`, request);
  }
}
