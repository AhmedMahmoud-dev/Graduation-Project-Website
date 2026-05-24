import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { VideoAnalysisResponse } from '../models/video-analysis.model';

@Injectable({
  providedIn: 'root'
})
export class VideoAnalysisService {
  private http = inject(HttpClient);

  analyze(videoFile: File): Observable<VideoAnalysisResponse> {
    const url = `${environment.videoApiUrl}/emotion/video`;
    const formData = new FormData();
    formData.append('file', videoFile);

    return this.http.post<VideoAnalysisResponse>(url, formData);
  }
}
