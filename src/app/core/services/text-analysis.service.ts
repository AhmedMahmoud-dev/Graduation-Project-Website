import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { TextAnalysisResult } from '../models/text-analysis.model';

@Injectable({
  providedIn: 'root'
})
export class TextAnalysisService {
  private http = inject(HttpClient);

  analyze(text: string): Observable<TextAnalysisResult> {
    const url = `${environment.textApiUrl}/emotion/text_model`;
    return this.http.post<TextAnalysisResult>(url, { text });
  }
}
