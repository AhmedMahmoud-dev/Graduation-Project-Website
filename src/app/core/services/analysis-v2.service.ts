import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { TextAnalysisResult, AnalysisSession } from '../models/text-analysis.model';
import { AudioAnalysisResponse, AudioAnalysisSession } from '../models/audio-analysis.model';
import { ImageAnalysisResponse, ImageAnalysisSession } from '../models/image-analysis.model';
import { VideoAnalysisResponse, VideoAnalysisSession } from '../models/video-analysis.model';
import { AuthService } from './auth.service';
import { ApiResponse } from '../models/api-response.model';
import { UserQuotaStatus } from '../models/quota.model';
import {
  AnalysisHistoryResponse,
  AnalysisStats,
  SaveTextAnalysisRequest,
  SaveAudioAnalysisRequest,
  SaveImageAnalysisRequest,
  SaveVideoAnalysisRequest,
  AnalysisDetails,
  AnalysisType
} from '../models/analysis-v2.model';
import { ShareLinkResponseDto, ActiveShareResponseDto, SharedAnalysisDto, SharedAnalysesPagedResponse } from '../models/share-feature.model';


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
   * Persists image analysis results to the .NET backend API v2.
   * @param clientId The unique ID for this analysis session (UUID)
   * @param result The analysis result object
   * @param imageFile The original image file
   */
  saveImageAnalysis(clientId: string, result: ImageAnalysisResponse, imageFile: File): Observable<ApiResponse<number>> {
    const url = `${environment.apiUrl}/api/analysis/image`;
    const formData = new FormData();

    formData.append('ImageFile', imageFile, imageFile.name);

    const requestMetadata: SaveImageAnalysisRequest = {
      client_id: clientId,
      result: result
    };
    formData.append('Request', JSON.stringify(requestMetadata));

    return this.http.post<ApiResponse<number>>(url, formData);
  }

  /**
   * Persists video analysis results to the .NET backend API v2.
   * @param clientId The unique ID for this analysis session (UUID)
   * @param result The analysis result object
   * @param videoFile The original video file
   */
  saveVideoAnalysis(clientId: string, result: VideoAnalysisResponse, videoFile: File): Observable<ApiResponse<number>> {
    const url = `${environment.apiUrl}/api/analysis/video`;
    const formData = new FormData();

    formData.append('VideoFile', videoFile, videoFile.name);

    const requestMetadata: SaveVideoAnalysisRequest = {
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

  getHistory(
    page: number = 1,
    pageSize: number = 10,
    type?: AnalysisType,
    search?: string,
    sortOrder?: string
  ): Observable<AnalysisHistoryResponse> {
    let url = `${environment.apiUrl}/api/analysis/history?page=${page}&pageSize=${pageSize}`;
    if (type) {
      url += `&type=${type}`;
    }
    if (search) {
      url += `&search=${encodeURIComponent(search)}`;
    }
    if (sortOrder) {
      const order = sortOrder === 'oldest' ? 'asc' : 'desc';
      url += `&sortOrder=${order}`;
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
   * Clears analysis history for the current user.
   * @param type Optional analysis type to selectively clear (e.g. 'text', 'audio', etc.)
   */
  clearHistory(type?: string): Observable<ApiResponse<boolean>> {
    let url = `${environment.apiUrl}/api/analysis/clear`;
    if (type && type !== 'all') {
      const capitalized = type.charAt(0).toUpperCase() + type.slice(1);
      url += `?type=${capitalized}`;
    }
    return this.http.delete<ApiResponse<boolean>>(url);
  }

  /**
   * Retrieves active weekly usage and limit metrics for the authenticated user.
   */
  getQuota(): Observable<ApiResponse<UserQuotaStatus>> {
    const url = `${environment.apiUrl}/api/analysis/quota`;
    return this.http.get<ApiResponse<UserQuotaStatus>>(url);
  }

  /**
   * Maps backend AnalysisDetails to frontend session models (Text, Audio, Image, or Video).
   */
  mapDetailsToSession(details: AnalysisDetails): AnalysisSession | AudioAnalysisSession | ImageAnalysisSession | VideoAnalysisSession {
    if (details.type === 'Text') {
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
    } else if (details.type === 'Audio') {
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
    } else if (details.type === 'Image') {
      const result = details.result as ImageAnalysisResponse;
      return {
        id: details.client_id,
        type: 'image',
        timestamp: details.timestamp,
        inputFileName: result.image_filename || 'Image File',
        result: result,
        isSynced: true,
        cloudId: details.id
      };
    } else if (details.type === 'Video') {
      const result = details.result as VideoAnalysisResponse;
      return {
        id: details.client_id,
        type: 'video',
        timestamp: details.timestamp,
        inputFileName: result.video_filename || 'Video File',
        result: result,
        isSynced: true,
        cloudId: details.id
      };
    } else {
      throw new Error(`Unsupported analysis type: ${details.type}`);
    }
  }

  /**
   * Enables a public share link for an analysis.
   */
  shareAnalysis(clientId: string): Observable<ApiResponse<ShareLinkResponseDto>> {
    const url = `${environment.apiUrl}/api/analysis/${clientId}/share`;
    return this.http.post<ApiResponse<ShareLinkResponseDto>>(url, {});
  }

  /**
   * Revokes the active public share link for an analysis.
   */
  revokeShare(clientId: string): Observable<ApiResponse<boolean>> {
    const url = `${environment.apiUrl}/api/analysis/${clientId}/share`;
    return this.http.delete<ApiResponse<boolean>>(url);
  }

  /**
   * Retrieves all currently active share links for the authenticated user.
   */
  getSharedAnalyses(page: number = 1, pageSize: number = 10): Observable<SharedAnalysesPagedResponse> {
    const url = `${environment.apiUrl}/api/analysis/shared?page=${page}&pageSize=${pageSize}`;
    return this.http.get<SharedAnalysesPagedResponse>(url);
  }

  /**
   * Retrieves the public, scrubbed analysis results by share token (Anonymous).
   */
  getSharedAnalysisDetails(shareToken: string): Observable<ApiResponse<SharedAnalysisDto>> {
    const url = `${environment.apiUrl}/api/analysis/shared/${shareToken}`;
    return this.http.get<ApiResponse<SharedAnalysisDto>>(url);
  }
}
