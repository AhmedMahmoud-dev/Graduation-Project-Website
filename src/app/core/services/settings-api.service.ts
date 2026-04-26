import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/api-response.model';

export interface ThemeColorsDto {
  color_bg?: string;
  color_surface?: string;
  color_border?: string;
  color_text?: string;
  color_text_muted?: string;
  color_primary?: string;
  color_accent?: string;
}

export interface AppearanceSettingsDto {
  light_theme?: ThemeColorsDto;
  dark_theme?: ThemeColorsDto;
  emotion_colors?: Record<string, string>;
  active_theme?: string; // 'light', 'dark', 'system'
}

@Injectable({
  providedIn: 'root'
})
export class SettingsApiService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/api/settings/appearance`;

  getAppearanceSettings(): Observable<ApiResponse<AppearanceSettingsDto>> {
    return this.http.get<ApiResponse<AppearanceSettingsDto>>(this.apiUrl);
  }

  updateAppearanceSettings(data: AppearanceSettingsDto): Observable<ApiResponse<boolean>> {
    return this.http.put<ApiResponse<boolean>>(this.apiUrl, data);
  }

  resetAppearanceSettings(): Observable<ApiResponse<boolean>> {
    return this.http.delete<ApiResponse<boolean>>(this.apiUrl);
  }
}
