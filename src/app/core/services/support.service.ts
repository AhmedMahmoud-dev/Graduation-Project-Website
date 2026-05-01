import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ContactSupportRequest } from '../models/support.model';

@Injectable({
  providedIn: 'root'
})
export class SupportService {
  private http = inject(HttpClient);

  /**
   * Submits a new support/contact request.
   */
  submitMessage(request: ContactSupportRequest): Observable<any> {
    return this.http.post(`${environment.apiUrl}/api/support/contact`, request);
  }

  /**
   * Retrieves the support message history for the current user.
   */
  getMyMessages(): Observable<any> {
    return this.http.get(`${environment.apiUrl}/api/support/contact`);
  }
}
