import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ImageAnalysisResponse } from '../models/image-analysis.model';

@Injectable({
  providedIn: 'root'
})
export class ImageAnalysisService {
  private http = inject(HttpClient);

  analyze(imageFile: File): Observable<ImageAnalysisResponse> {
    const url = `${environment.imageApiUrl}/emotion/image`;
    const formData = new FormData();
    formData.append('file', imageFile);

    return this.http.post<ImageAnalysisResponse>(url, formData);
  }
}
