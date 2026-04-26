import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AudioAnalysisResponse } from '../models/audio-analysis.model';

@Injectable({
  providedIn: 'root'
})
export class AudioAnalysisService {
  private http = inject(HttpClient);
  
  analyze(audioFile: File): Observable<AudioAnalysisResponse> {
    const url = `${environment.audioApiUrl}/emotion/audio_model`;
    const formData = new FormData();
    formData.append('file', audioFile);

    return this.http.post<AudioAnalysisResponse>(url, formData);
  }
}
