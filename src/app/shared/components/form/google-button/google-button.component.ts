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

    // Otherwise wait for the script to finish loading
    const gsiScript = document.querySelector('script[src*="accounts.google.com/gsi/client"]') as HTMLScriptElement;

    if (gsiScript) {
      gsiScript.addEventListener('load', () => {
        this.ngZone.run(() => this.renderGoogleButton());
      });
    } else {
      // Fallback: dynamically inject the script if missing from DOM
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = () => this.ngZone.run(() => this.renderGoogleButton());
      document.head.appendChild(script);
    }
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

