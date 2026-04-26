import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { TextAnalysisResult, AnalysisSession } from '../models/text-analysis.model';
import { AudioAnalysisResponse, AudioAnalysisSession } from '../models/audio-analysis.model';
import { AuthService } from './auth.service';
import { ApiResponse } from '../models/api-response.model';
import {
  AnalysisHistoryResponse,
  AnalysisStats,
  SaveTextAnalysisRequest,
  SaveAudioAnalysisRequest,
  AnalysisDetails,
  AnalysisType
} from '../models/analysis-v2.model';

@Injectable({
  providedIn: 'root'
})
export class AnalysisV2Service {
  private http = inject(HttpClient);
  private authService = inject(AuthService);

  /**
   * Persists text analysis results to the .NET backend API v2.
   * @param clientId The unique ID for this analysis session (UUID)
   * @param result The analysis result object
   */
  saveTextAnalysis(clientId: string, result: TextAnalysisResult): Observable<ApiResponse<number>> {
    const payload: SaveTextAnalysisRequest = {
      client_id: clientId,
      result: result
    };

    const url = `${environment.apiUrl}/api/analysis/text`;
    return this.http.post<ApiResponse<number>>(url, payload);
  }

  /**
   * Persists audio analysis results to the .NET backend API v2.
   * @param clientId The unique ID for this analysis session (UUID)
   * @param result The analysis result object
   * @param audioFile The original audio file
   */
  saveAudioAnalysis(clientId: string, result: AudioAnalysisResponse, audioFile: File): Observable<ApiResponse<number>> {
    const url = `${environment.apiUrl}/api/analysis/audio`;
    const formData = new FormData();

    formData.append('AudioFile', audioFile, audioFile.name);

    const requestMetadata: SaveAudioAnalysisRequest = {
      client_id: clientId,
      result: result
    };
    formData.append('Request', JSON.stringify(requestMetadata));

    return this.http.post<ApiResponse<number>>(url, formData);
  }

  /**
   * Retrieves lifetime usage metrics and emotion distribution data for the dashboard.
   */
  getStats(): Observable<ApiResponse<AnalysisStats>> {
    const url = `${environment.apiUrl}/api/analysis/stats`;
    return this.http.get<ApiResponse<AnalysisStats>>(url);
  }

  /**
   * Retrieves a paginated list of analysis summaries for the current user.
   */
  getHistory(page: number = 1, limit: number = 10, type?: AnalysisType): Observable<AnalysisHistoryResponse> {
    let url = `${environment.apiUrl}/api/analysis/history?page=${page}&limit=${limit}`;
    if (type) {
      url += `&type=${type}`;
    }
    return this.http.get<AnalysisHistoryResponse>(url);
  }

  /**
   * Retrieves the full, original analysis results for a specific record.
   */
  getAnalysisDetails(clientId: string): Observable<ApiResponse<AnalysisDetails>> {
    const url = `${environment.apiUrl}/api/analysis/${clientId}`;
    return this.http.get<ApiResponse<AnalysisDetails>>(url);
  }

  /**
   * Fetches the audio file for a specific analysis as an authenticated Blob.
   * Use this instead of a raw URL so the Authorization header is included.
   * Convert the returned Blob to a local object URL for the <audio> player.
   */
  getMediaStream(analysisId: string | number): Observable<Blob> {
    const url = `${environment.apiUrl}/api/analysis/media/${analysisId}`;
    // responseType: 'blob' tells Angular to treat the response as binary data.
    return this.http.get(url, { responseType: 'blob' });
  }

  /**
   * Deletes a specific analysis record by ID.
   */
  deleteAnalysis(clientId: string): Observable<ApiResponse<boolean>> {
    const url = `${environment.apiUrl}/api/analysis/${clientId}`;
    return this.http.delete<ApiResponse<boolean>>(url);
  }

  /**
   * Clears all analysis history for the current user.
   */
  clearHistory(): Observable<ApiResponse<boolean>> {
    const url = `${environment.apiUrl}/api/analysis/clear`;
    return this.http.delete<ApiResponse<boolean>>(url);
  }

  /**
   * Maps backend AnalysisDetails to frontend session models (Text or Audio).
   */
  mapDetailsToSession(details: AnalysisDetails): AnalysisSession | AudioAnalysisSession {
    const isText = details.type === 'Text';

    if (isText) {
      const result = details.result as TextAnalysisResult;
      return {
        id: details.client_id,
        type: 'text',
        timestamp: details.timestamp,
        input: result.text || '',
        result: result,
        isSynced: true,
        cloudId: details.id
      };
    } else {
      const result = details.result as AudioAnalysisResponse;
      return {
        id: details.client_id,
        type: 'audio',
        timestamp: details.timestamp,
        inputFileName: result.audio_filename || 'Audio File',
        durationSeconds: result.audio_emotion?.duration_seconds || 0,
        result: result,
        isSynced: true,
        cloudId: details.id
      };
    }
  }
}
