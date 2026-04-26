# Using the Media and Audio Analysis Endpoints in Angular

This guide explains how to interact with the Audio Analysis service, specifically focusing on saving (uploading) files and retrieving them using the media endpoint.

---

## 1. How to Save/Upload the File (The "Save to Database" part)

To "save a file in the database," you should use the **Audio Analysis Save** endpoint. This endpoint takes the audio file and the JSON analysis results together.

**Endpoint:** `POST /api/analysis/audio`  
**Content-Type:** `multipart/form-data`

### Angular Service Implementation

```typescript
import { HttpClient, HttpHeaders } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { Observable } from "rxjs";

@Injectable({
  providedIn: "root",
})
export class AnalysisService {
  private apiUrl = "https://your-api.com/api/analysis";

  constructor(private http: HttpClient) {}

  /**
   * Saves the audio analysis result and the physical file to the database.
   * @param audioFile The Blob or File object from the recorder
   * @param analysisData The JSON results from the AI model
   */
  saveAudioAnalysis(audioFile: Blob, analysisData: any): Observable<any> {
    const formData = new FormData();

    // 1. Append the physical audio file
    formData.append("audio_file", audioFile, "recording.wav");

    // 2. Append the JSON metadata as a string field named 'request'
    // The backend expects a snake_case JSON structure here.
    const requestMetadata = {
      client_id: analysisData.clientId || crypto.randomUUID(),
      result: analysisData.result,
    };
    formData.append("request", JSON.stringify(requestMetadata));

    // IMPORTANT: Do NOT manually set Content-Type header to 'multipart/form-data'.
    // The browser will do it automatically and add the correct 'boundary' string.
    return this.http.post(`${this.apiUrl}/audio`, formData);
  }
}
```

---

## 2. How to Use the Media Endpoint (Fetch/Stream)

Once a file is saved, you use the endpoint you mentioned to retrieve it for playback.

**Endpoint:** `GET /api/analysis/media/{analysisId}`

### Angular Service Implementation

```typescript
  /**
   * Fetches the audio file for a specific analysis so it can be played.
   */
  getMediaStream(analysisId: number): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/media/${analysisId}`, {
      responseType: 'blob' // CRITICAL: Tells Angular to treat the response as a file/binary
    });
  }
```

### Component Usage (Playback)

To play the audio in your HTML, you need to convert the `Blob` into a URL that an `<audio>` tag can understand.

```typescript
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';

// Inside your component:
audioUrl: SafeUrl | null = null;

loadAudio(id: number) {
  this.analysisService.getMediaStream(id).subscribe({
    next: (blob: Blob) => {
      // Create a local URL for the blob
      const unsafeUrl = URL.createObjectURL(blob);
      // Sanitize it for security
      this.audioUrl = this.sanitizer.bypassSecurityTrustUrl(unsafeUrl);
    },
    error: (err) => console.error("Could not load audio", err)
  });
}
```

**HTML Template:**

```html
<audio *ngIf="audioUrl" [src]="audioUrl" controls></audio>
```

---

## 3. Important Notes for Success

1.  **Authentication**: Ensure your `HttpInterceptor` adds the `Authorization: Bearer <token>` header to these requests.
2.  **FormData Pitfall**: Never set `headers: new HttpHeaders({'Content-Type': 'multipart/form-data'})` when using `FormData`. If you do, the boundary header will be missing, and the backend will fail to parse the file. Let the browser handle it.
3.  **JSON Serialization**: The backend expects the JSON part in a field named `request`. Make sure you use `JSON.stringify(data)` before appending it to `FormData`.
4.  **Database Storage**: On the backend, when you call the `audio` POST, the file is usually saved to a physical folder (like `wwwroot/Uploads`), and a record is created in the `MediaFiles` table, which is then linked to your `Analysis` record.

---
