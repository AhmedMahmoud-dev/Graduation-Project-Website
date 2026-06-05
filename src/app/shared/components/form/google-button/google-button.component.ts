import { Component, Output, EventEmitter, input, signal, computed } from '@angular/core';
import { environment } from '../../../../../environments/environment';

@Component({
  selector: 'app-google-button',
  standalone: true,
  templateUrl: './google-button.component.html',
  styles: [`
    .btn-spinner {
      animation: google-spin 1s linear infinite;
    }
    @keyframes google-spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
    .google-btn.loading {
      opacity: 1 !important;
      cursor: wait;
    }
    .google-btn.loading:hover {
      background: rgba(0, 0, 0, 0.03) !important;
    }
    [data-theme="dark"] .google-btn.loading:hover {
      background: rgba(255, 255, 255, 0.05) !important;
    }
  `]
})
export class GoogleButtonComponent {
  disabled = input(false);
  @Output() credential = new EventEmitter<string>(); // Maintained for template compatibility

  isPopupOpen = signal(false);
  showSpinner = computed(() => this.disabled() || this.isPopupOpen());

  loginWithGoogle() {
    if (this.disabled() || this.isPopupOpen()) return;

    const clientId = environment.googleClientId;
    // Set redirectUri to the dedicated Google OAuth callback route
    const redirectUri = window.location.origin + '/auth/google/callback';
    const state = Math.random().toString(36).substring(2);
    const scope = 'openid email profile';

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${encodeURIComponent(clientId)}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&response_type=code` +
      `&scope=${encodeURIComponent(scope)}` +
      `&state=${encodeURIComponent(state)}`;

    // Open Google Sign-In in a centered popup window
    const width = 500;
    const height = 600;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;

    this.isPopupOpen.set(true);

    const popup = window.open(
      authUrl,
      'google_signin_popup',
      `width=${width},height=${height},left=${left},top=${top},status=no,resizable=yes,scrollbars=yes`
    );

    if (popup) {
      popup.focus();

      // Poll to detect when the popup window is closed (by user or callback code redirect)
      const pollTimer = setInterval(() => {
        if (popup.closed) {
          clearInterval(pollTimer);
          this.isPopupOpen.set(false);
        }
      }, 500);
    } else {
      // If popup fails to open (e.g. blocked), reset the loading state
      this.isPopupOpen.set(false);
    }
  }
}
