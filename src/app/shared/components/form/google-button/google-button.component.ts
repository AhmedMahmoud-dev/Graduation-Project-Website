import { Component, ElementRef, AfterViewInit, Output, EventEmitter, ViewChild, NgZone, input } from '@angular/core';
import { environment } from '../../../../../environments/environment';

declare const google: any;

@Component({
  selector: 'app-google-button',
  standalone: true,
  templateUrl: './google-button.component.html',
  styleUrls: []
})
export class GoogleButtonComponent implements AfterViewInit {
  disabled = input(false);
  @Output() credential = new EventEmitter<string>();

  @ViewChild('googleBtnContainer', { static: true }) googleBtnContainer!: ElementRef;

  constructor(private ngZone: NgZone) {}

  ngAfterViewInit() {
    this.initGoogleButton();
  }

  private initGoogleButton(): void {
    // If the GIS library is already loaded (cached), initialize immediately
    if (typeof google !== 'undefined' && google?.accounts?.id) {
      this.renderGoogleButton();
      return;
    }

    // Otherwise, ensure the script tag exists in DOM
    let gsiScript = document.querySelector('script[src*="accounts.google.com/gsi/client"]') as HTMLScriptElement;
    if (!gsiScript) {
      gsiScript = document.createElement('script');
      gsiScript.src = 'https://accounts.google.com/gsi/client';
      gsiScript.async = true;
      gsiScript.defer = true;
      document.head.appendChild(gsiScript);
    }

    // Poll every 100ms to check if the global 'google' object is fully loaded and initialized
    const interval = setInterval(() => {
      if (typeof google !== 'undefined' && google?.accounts?.id) {
        clearInterval(interval);
        this.ngZone.run(() => this.renderGoogleButton());
      }
    }, 100);

    // Stop polling after 10 seconds to prevent resource leaks if script loading is blocked (e.g. by ad blockers)
    setTimeout(() => clearInterval(interval), 10000);
  }

  private renderGoogleButton(): void {
    google.accounts.id.initialize({
      client_id: environment.googleClientId,
      callback: (response: any) => {
        if (response?.credential) {
          this.ngZone.run(() => this.credential.emit(response.credential));
        }
      },
      auto_select: false,
      cancel_on_tap_outside: true
    });

    google.accounts.id.renderButton(
      this.googleBtnContainer.nativeElement,
      { theme: 'outline', size: 'large', width: 400 }
    );
  }
}

