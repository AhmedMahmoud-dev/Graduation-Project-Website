import { Injectable, signal, computed, effect, PLATFORM_ID, Inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

export type ThemeMode = 'light' | 'dark' | 'system';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private readonly THEME_KEY = 'emotra_theme';

  public currentTheme = signal<ThemeMode>('system');

  public resolvedTheme = computed<'light' | 'dark'>(() => {
    const theme = this.currentTheme();
    if (theme === 'system') {
      if (typeof window !== 'undefined' && window.matchMedia) {
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      }
      return 'light'; // default fallback
    }
    return theme;
  });

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {
    if (isPlatformBrowser(this.platformId)) {
      this.initTheme();
    }
  }

  private initTheme(): void {
    const storedTheme = localStorage.getItem(this.THEME_KEY) as ThemeMode | null;

    // Set initial state without triggering effect bindings before sync
    if (storedTheme === 'light' || storedTheme === 'dark' || storedTheme === 'system') {
      this.currentTheme.set(storedTheme);
    } else {
      this.currentTheme.set('system');
    }

    // Apply the resolved theme to the document root
    this.applyThemeToDOM(this.resolvedTheme());

    // Effect to auto-save and apply changes
    effect(() => {
      const mode = this.currentTheme();
      localStorage.setItem(this.THEME_KEY, mode);

      // The resolved theme is used to set the actual DOM attribute
      this.applyThemeToDOM(this.resolvedTheme());
    });

    // Listen for system theme changes if set to 'system'
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      if (this.currentTheme() === 'system') {
        const newResolvedTheme = e.matches ? 'dark' : 'light';
        this.applyThemeToDOM(newResolvedTheme);
      }
    });
  }

  private applyThemeToDOM(theme: 'light' | 'dark'): void {
    if (theme === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
      // Update tailwind dark mode if class strategy is also used:
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
      document.documentElement.classList.remove('dark');
    }
  }

  public setTheme(mode: ThemeMode): void {
    this.currentTheme.set(mode);
  }
}
