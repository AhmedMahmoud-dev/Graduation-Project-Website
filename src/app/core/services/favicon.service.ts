import { Injectable, inject, effect, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { ThemeService } from './theme.service';
import { ColorSettingsService } from './color-settings.service';

@Injectable({
  providedIn: 'root'
})
export class FaviconService {
  private themeService = inject(ThemeService);
  private colorSettingsService = inject(ColorSettingsService);
  private platformId = inject(PLATFORM_ID);

  private readonly SVG_TEMPLATE = `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M9 3v2M15 3v2M3 9h2M19 9h2M12 19c-3.866 0-7-3.134-7-7s3.134-7 7-7 7 3.134 7 7-7 3.134-7 7z" stroke="{{COLOR}}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M9 12c.5-1 1.5-1.5 3-1.5s2.5.5 3 1.5M12 6q0 3 -2 5" stroke="{{COLOR}}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      this.initDynamicFavicon();
    }
  }

  private initDynamicFavicon(): void {
    // Watch for theme and color changes
    effect(() => {
      const theme = this.themeService.resolvedTheme();
      const colors = theme === 'light' 
        ? this.colorSettingsService.lightColors() 
        : this.colorSettingsService.darkColors();
      
      const primaryColor = colors['--color-primary'] || '#6c63ff';
      this.updateFavicon(primaryColor);
    });
  }

  private updateFavicon(color: string): void {
    const svgContent = this.SVG_TEMPLATE.replace(/{{COLOR}}/g, color);
    const dataUri = `data:image/svg+xml,${encodeURIComponent(svgContent)}`;

    let link: HTMLLinkElement | null = document.getElementById('app-favicon') as HTMLLinkElement;
    
    if (!link) {
      link = document.querySelector("link[rel*='icon']");
    }

    if (!link) {
      link = document.createElement('link');
      link.id = 'app-favicon';
      link.rel = 'icon';
      document.head.appendChild(link);
    }

    link.type = 'image/svg+xml';
    link.href = dataUri;
  }
}
