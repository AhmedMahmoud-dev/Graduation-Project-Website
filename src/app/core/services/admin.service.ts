import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/api-response.model';
import {
  PlatformStats,
  PaginatedAdminResponse,
  AdminUser,
  AdminBugReport,
  AdminTestimonial,
  ServiceHealth
} from '../models/admin.model';

@Injectable({
  providedIn: 'root'
})
export class AdminService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/api/admin`;

  /**
   * 1. Platform Statistics
   * Provides an overview of users, analyses, and system trends.
   */
  getStats(): Observable<ApiResponse<PlatformStats>> {
    return this.http.get<ApiResponse<PlatformStats>>(`${this.apiUrl}/stats`);
  }

  /**
   * 2.1 List All Users
   * Retrieves a paginated list of registered users.
   */
  getUsers(page: number = 1, pageSize: number = 10): Observable<PaginatedAdminResponse<AdminUser[]>> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('pageSize', pageSize.toString());
    return this.http.get<PaginatedAdminResponse<AdminUser[]>>(`${this.apiUrl}/users`, { params });
  }

  updateUserStatus(userId: string, isActive: boolean, banReason: string | null = null, banDurationHours: number | null = null): Observable<ApiResponse<null>> {
    const payload = { 
      is_active: isActive, 
      ban_reason: banReason, 
      ban_duration_hours: banDurationHours 
    };
    return this.http.patch<ApiResponse<null>>(`${this.apiUrl}/users/${userId}/status`, payload);
  }

  /**
   * 2.3 Permanent User Deletion (Nuclear Delete)
   * Purges a user account and all related data (analyses, files, feedback).
   * REQUIRES administrative password verification.
   */
  deleteUser(userId: string, adminPassword: string): Observable<ApiResponse<null>> {
    return this.http.request<ApiResponse<null>>('DELETE', `${this.apiUrl}/users/${userId}`, {
      body: { admin_password: adminPassword }
    });
  }

  /**
   * 3.1 List All Bug Reports
   * Retrieves a paginated list of technical issues.
   */
  getBugReports(page: number = 1, pageSize: number = 10): Observable<PaginatedAdminResponse<AdminBugReport[]>> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('pageSize', pageSize.toString());
    return this.http.get<PaginatedAdminResponse<AdminBugReport[]>>(`${this.apiUrl}/bugs`, { params });
  }

  /**
   * 3.2 Update Bug Status
   * Updates the progress of a bug report.
   */
  updateBugStatus(bugId: number, status: string): Observable<ApiResponse<null>> {
    // Sending a raw string requires properly setting content-type and stringifying
    return this.http.patch<ApiResponse<null>>(`${this.apiUrl}/bugs/${bugId}/status`, JSON.stringify(status), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  /**
   * 3.3 Delete Bug Report
   * Permanently removes a bug report from the system.
   */
  deleteBugReport(bugId: number): Observable<ApiResponse<null>> {
    return this.http.delete<ApiResponse<null>>(`${this.apiUrl}/bugs/${bugId}`);
  }

  /**
   * 4.1 List Pending Testimonials
   * Retrieves public feedback that requires moderation.
   */
  getPendingTestimonials(page: number = 1, pageSize: number = 10): Observable<PaginatedAdminResponse<AdminTestimonial[]>> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('pageSize', pageSize.toString());
    return this.http.get<PaginatedAdminResponse<AdminTestimonial[]>>(`${this.apiUrl}/testimonials/pending`, { params });
  }

  /**
   * 4.2 Moderate Testimonial
   * Approves or rejects a testimonial.
   */
  moderateTestimonial(id: number, isApproved: boolean): Observable<ApiResponse<null>> {
    return this.http.post<ApiResponse<null>>(`${this.apiUrl}/testimonials/${id}/moderate`, isApproved);
  }

  /**
   * 5. Infrastructure Health
   * Monitors the real-time status of connected AI Microservices.
   */
  getHealth(): Observable<ApiResponse<ServiceHealth[]>> {
    return this.http.get<ApiResponse<ServiceHealth[]>>(`${this.apiUrl}/health`);
  }
}
