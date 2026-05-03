import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ContactSupportRequest, SupportMessage, SupportMessageResponse } from '../models/support.model';
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
   * Retrieves the support message history for the current user.
   */
  getMyMessages(): Observable<ApiResponse<SupportMessage[]>> {
    return this.http.get<ApiResponse<SupportMessage[]>>(`${environment.apiUrl}/api/support/contact`);
  }
}
