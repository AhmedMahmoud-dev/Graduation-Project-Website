import { Component, Output, EventEmitter, input } from '@angular/core';
import { environment } from '../../../../../environments/environment';

@Component({
  selector: 'app-google-button',
  standalone: true,
  templateUrl: './google-button.component.html',
  styles: []
})
export class GoogleButtonComponent {
  disabled = input(false);
  @Output() credential = new EventEmitter<string>(); // Maintained for template compatibility

  loginWithGoogle() {
    if (this.disabled()) return;

    const clientId = environment.googleClientId;
    // Set redirectUri to the current page path dynamically (login or register callback)
    const redirectUri = window.location.origin + window.location.pathname;
    const state = Math.random().toString(36).substring(2);
    const scope = 'openid email profile';

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${encodeURIComponent(clientId)}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&response_type=code` +
      `&scope=${encodeURIComponent(scope)}` +
      `&state=${encodeURIComponent(state)}`;

    // Redirect browser to Google Sign-In
    window.location.href = authUrl;
  }
}
