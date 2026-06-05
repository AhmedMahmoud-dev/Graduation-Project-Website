import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-google-callback',
  standalone: true,
  template: `
    <div style="display: flex; flex-direction: column; justify-content: center; align-items: center; height: 100vh; font-family: system-ui, -apple-system, sans-serif; background-color: #f9fafb; color: #1f2937;">
      <div style="text-align: center; padding: 2rem;">
        <div style="width: 40px; height: 40px; border: 3px solid #e5e7eb; border-top-color: #3b82f6; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 1rem auto;"></div>
        <h2 style="font-size: 1.25rem; font-weight: 600; margin-bottom: 0.5rem;">Authenticating with Google...</h2>
        <p style="color: #6b7280; font-size: 0.875rem;">This window will close automatically.</p>
      </div>
      <style>
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      </style>
    </div>
  `
})
export class GoogleCallbackComponent implements OnInit {
  private route = inject(ActivatedRoute);

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      const code = params['code'];
      const error = params['error'];

      if (code) {
        if (window.opener) {
          window.opener.postMessage({ type: 'google-auth-callback', code }, window.location.origin);
        }
        window.close();
      } else if (error) {
        if (window.opener) {
          window.opener.postMessage({ type: 'google-auth-error', error }, window.location.origin);
        }
        window.close();
      } else {
        // If loaded directly without code/error parameters, close the window.
        window.close();
      }
    });
  }
}
