import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ContactSupportRequest, SupportMessage, SupportMessageResponse, SupportPagedResponse } from '../models/support.model';
import { ApiResponse } from '../models/api-response.model';

@Injectable({
  providedIn: 'root'
})
export class SupportService {
  private http = inject(HttpClient);

  /**
   * Submits a new support/contact request.
   */
  submitMessage(request: ContactSupportRequest): Observable<ApiResponse<SupportMessageResponse>> {
    return this.http.post<ApiResponse<SupportMessageResponse>>(`${environment.apiUrl}/api/support/contact`, request);
  }

  /**
   * Retrieves the support message history for the current user (paginated).
   */
  getMyMessages(page: number = 1, pageSize: number = 10): Observable<SupportPagedResponse> {
    return this.http.get<SupportPagedResponse>(`${environment.apiUrl}/api/support/contact`, {
      params: { page: page.toString(), page_size: pageSize.toString() }
    });
  }
}
