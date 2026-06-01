import { Component, ElementRef, AfterViewInit, Output, EventEmitter, ViewChild, NgZone, input, OnDestroy, effect } from '@angular/core';
import { environment } from '../../../../../environments/environment';
import { ThemeService } from '../../../../core/services/theme.service';

declare const google: any;

@Component({
  selector: 'app-google-button',
  standalone: true,
  templateUrl: './google-button.component.html',
  styles: [`
    .help-box {
      animation: fadeIn 0.2s ease-out;
    }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(-4px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `]
})
export class GoogleButtonComponent implements AfterViewInit, OnDestroy {
  disabled = input(false);
  @Output() credential = new EventEmitter<string>();

  @ViewChild('googleBtnContainer', { static: true }) googleBtnContainer!: ElementRef;

  scriptFailedToLoad = false;
  showHelp = false;

  private resizeListener?: () => void;
  private resizeTimeout: any;

  constructor(
    private ngZone: NgZone,
    private themeService: ThemeService
  ) {
    // Re-render the Google button when the theme changes
    effect(() => {
      const theme = this.themeService.resolvedTheme();
      this.ngZone.run(() => {
        if (typeof google !== 'undefined' && google?.accounts?.id) {
          this.renderGoogleButton();
        }
      });
    });
  }

  ngAfterViewInit() {
    this.initGoogleButton();
  }

  ngOnDestroy() {
    if (this.resizeListener) {
      window.removeEventListener('resize', this.resizeListener);
    }
    if (this.resizeTimeout) {
      clearTimeout(this.resizeTimeout);
    }
  }

  toggleHelp() {
    this.showHelp = !this.showHelp;
  }

  private initGoogleButton(): void {
    // If the GIS library is already loaded (cached), initialize immediately
    if (typeof google !== 'undefined' && google?.accounts?.id) {
      this.scriptFailedToLoad = false;
      this.renderGoogleButton();
      this.setupResizeListener();
      return;
    }

    // Otherwise, ensure the script tag exists in DOM
    let gsiScript = document.querySelector('script[src*="accounts.google.com/gsi/client"]') as HTMLScriptElement;
    if (!gsiScript) {
      gsiScript = document.createElement('script');
      gsiScript.src = 'https://accounts.google.com/gsi/client';
      gsiScript.async = true;
      gsiScript.defer = true;
      
      gsiScript.onerror = () => {
        this.ngZone.run(() => {
          this.scriptFailedToLoad = true;
        });
      };
      
      document.head.appendChild(gsiScript);
    } else {
      gsiScript.addEventListener('error', () => {
        this.ngZone.run(() => {
          this.scriptFailedToLoad = true;
        });
      });
    }

    // Poll every 100ms to check if the global 'google' object is fully loaded and initialized
    const interval = setInterval(() => {
      if (typeof google !== 'undefined' && google?.accounts?.id) {
        clearInterval(interval);
        this.ngZone.run(() => {
          this.scriptFailedToLoad = false;
          this.renderGoogleButton();
          this.setupResizeListener();
        });
      }
    }, 100);

    // Stop polling after 10 seconds to prevent resource leaks if script loading is blocked (e.g. by ad blockers)
    setTimeout(() => {
      clearInterval(interval);
      if (typeof google === 'undefined' || !google?.accounts?.id) {
        this.ngZone.run(() => {
          this.scriptFailedToLoad = true;
        });
      }
    }, 10000);
  }

  private renderGoogleButton(): void {
    const element = this.googleBtnContainer.nativeElement;
    if (!element) return;

    // Clear previous rendering
    element.innerHTML = '';

    // Calculate dynamic responsive width (Google limits width between 250px and 400px)
    const rawWidth = element.clientWidth || 320;
    const buttonWidth = Math.min(Math.max(rawWidth, 250), 400);

    const isDark = this.themeService.resolvedTheme() === 'dark';

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
      element,
      { 
        theme: isDark ? 'filled_black' : 'outline', 
        size: 'large', 
        width: buttonWidth,
        text: 'continue_with',
        shape: 'rectangular',
        logo_alignment: 'center'
      }
    );
  }

  private setupResizeListener(): void {
    if (this.resizeListener) return;

    this.resizeListener = () => {
      if (this.resizeTimeout) {
        clearTimeout(this.resizeTimeout);
      }
      this.resizeTimeout = setTimeout(() => {
        this.ngZone.run(() => this.renderGoogleButton());
      }, 250);
    };

    window.addEventListener('resize', this.resizeListener);
  }
}
