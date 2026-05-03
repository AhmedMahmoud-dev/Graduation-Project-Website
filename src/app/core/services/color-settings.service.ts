import { Injectable, signal, effect, inject, PLATFORM_ID, untracked } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ThemeService } from './theme.service';
import { ThemeColorsDto } from '../models/appearance.model';
import { environment } from '../../../environments/environment';

export const DEFAULT_LIGHT_COLORS: Record<string, string> = {
  '--color-bg': '#ffffff',
  '--color-surface': '#f8f9fc',
  '--color-border': '#e2e8f0',
  '--color-text': '#1a1a2e',
  '--color-text-muted': '#64748b',
  '--color-primary': '#6c63ff',
  '--color-accent': '#00d4aa',
};

export const DEFAULT_DARK_COLORS: Record<string, string> = {
  '--color-bg': '#020617',
  '--color-surface': '#0b0f21',
  '--color-border': '#2a2a3d',
  '--color-text': '#e2e8f0',
  '--color-text-muted': '#64748b',
  '--color-primary': '#6c63ff',
  '--color-accent': '#00d4aa',
};

export const DEFAULT_EMOTION_COLORS: Record<string, string> = {
  'anger': '#ff4757',
  'disgust': '#a29bfe',
  'fear': '#fd9644',
  'joy': '#ffd32a',
  'neutral': '#778ca3',
  'sadness': '#4a90d9',
  'surprise': '#00d4aa',
};

export const PRESET_THEMES = [
  {
    id: 'default',
    name: 'Default',
    description: 'Emotra default purple theme',
    preview: '#6c63ff',
    light: {
      '--color-bg': '#ffffff',
      '--color-surface': '#f8f9fc',
      '--color-border': '#e2e8f0',
      '--color-text': '#1a1a2e',
      '--color-text-muted': '#64748b',
      '--color-primary': '#6c63ff',
      '--color-accent': '#00d4aa',
    },
    dark: {
      '--color-bg': '#020617',
      '--color-surface': '#0b0f21',
      '--color-border': '#2a2a3d',
      '--color-text': '#e2e8f0',
      '--color-text-muted': '#64748b',
      '--color-primary': '#6c63ff',
      '--color-accent': '#00d4aa',
    },
    emotions: { ...DEFAULT_EMOTION_COLORS }
  },
  {
    id: 'ocean',
    name: 'Ocean',
    description: 'Deep ocean blue theme',
    preview: '#00aaff',
    light: {
      '--color-bg': '#f0f7ff',
      '--color-surface': '#ffffff',
      '--color-border': '#bdd9f2',
      '--color-text': '#02243d',
      '--color-text-muted': '#4a7a9b',
      '--color-primary': '#00aaff',
      '--color-accent': '#ff6b35',
    },
    dark: {
      '--color-bg': '#020b18',
      '--color-surface': '#041428',
      '--color-border': '#0d3a5c',
      '--color-text': '#e8f4ff',
      '--color-text-muted': '#5b8db8',
      '--color-primary': '#00aaff',
      '--color-accent': '#ff6b35',
    },
    emotions: {
      'anger': '#ef4444',
      'disgust': '#06b6d4',
      'fear': '#3b82f6',
      'joy': '#fbbf24',
      'neutral': '#94a3b8',
      'sadness': '#1e3a8a',
      'surprise': '#2dd4bf',
    }
  },
  {
    id: 'forest',
    name: 'Forest',
    description: 'Deep green nature theme',
    preview: '#00c896',
    light: {
      '--color-bg': '#f2faf6',
      '--color-surface': '#ffffff',
      '--color-border': '#b2deca',
      '--color-text': '#0a2218',
      '--color-text-muted': '#4a7a62',
      '--color-primary': '#00c896',
      '--color-accent': '#f0a500',
    },
    dark: {
      '--color-bg': '#020e08',
      '--color-surface': '#061510',
      '--color-border': '#0d3320',
      '--color-text': '#e0f5ec',
      '--color-text-muted': '#4a8f6a',
      '--color-primary': '#00c896',
      '--color-accent': '#f0a500',
    },
    emotions: {
      'anger': '#991b1b',
      'disgust': '#22c55e',
      'fear': '#166534',
      'joy': '#fde047',
      'neutral': '#64748b',
      'sadness': '#334155',
      'surprise': '#f97316',
    }
  },
];

@Injectable({ providedIn: 'root' })
export class ColorSettingsService {
  private readonly THEME_KEY = 'emotra_theme_colors';
  private readonly EMOTION_KEY = 'emotra_emotion_colors';
  private platformId = inject(PLATFORM_ID);
  private http = inject(HttpClient);
  private themeService = inject(ThemeService);
  private apiUrl = `${environment.apiUrl}/api/settings/appearance`;

  // State Signals
  private lightThemeSignal = signal<Record<string, string>>({ ...DEFAULT_LIGHT_COLORS });
  private darkThemeSignal = signal<Record<string, string>>({ ...DEFAULT_DARK_COLORS });
  private emotionColorsSignal = signal<Record<string, string>>({ ...DEFAULT_EMOTION_COLORS });

  // Read-only public signals
  public lightColors = this.lightThemeSignal.asReadonly();
  public darkColors = this.darkThemeSignal.asReadonly();
  public emotionColors = this.emotionColorsSignal.asReadonly();

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      this.loadFromStorage();

      // Automatically apply changes when signals update
      effect(() => {
        const light = this.lightThemeSignal();
        const dark = this.darkThemeSignal();
        untracked(() => {
          this.applyThemeColors(light, dark);
        });
      });

      effect(() => {
        const emotions = this.emotionColorsSignal();
        untracked(() => {
          this.applyEmotionColors(emotions);
        });
      });
    }
  }

  public syncWithBackend(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    // We use fetch or inject SettingsApiService? 
    // Let's use HttpClient directly to avoid circular dependency if SettingsApiService uses this.
    // Actually SettingsApiService doesn't seem to use this service.

    this.http.get<any>(this.apiUrl).subscribe({
      next: (res) => {
        if (res.is_success && res.data) {
          const data = res.data;
          if (data.light_theme && data.dark_theme) {
            const light = this.mapDtoToCss(data.light_theme);
            const dark = this.mapDtoToCss(data.dark_theme);
            this.saveThemeColors(light, dark);
          }
          if (data.emotion_colors) {
            this.saveEmotionColors(data.emotion_colors);
          }
          if (data.active_theme) {
            const localMode = localStorage.getItem('emotra_theme');
            // Only overwrite if NO local preference exists at all. 
            // Once a user sets it on a machine (even to 'system'), that machine's preference is authoritative.
            if (!localMode) {
              this.themeService.setTheme(data.active_theme);
            }
          }
        }
      },
      error: (err) => console.error('Failed to sync theme with backend', err)
    });
  }

  private mapDtoToCss(dto: ThemeColorsDto): Record<string, string> {
    return {
      '--color-bg': dto.color_bg || DEFAULT_LIGHT_COLORS['--color-bg'],
      '--color-surface': dto.color_surface || DEFAULT_LIGHT_COLORS['--color-surface'],
      '--color-border': dto.color_border || DEFAULT_LIGHT_COLORS['--color-border'],
      '--color-text': dto.color_text || DEFAULT_LIGHT_COLORS['--color-text'],
      '--color-text-muted': dto.color_text_muted || DEFAULT_LIGHT_COLORS['--color-text-muted'],
      '--color-primary': dto.color_primary || DEFAULT_LIGHT_COLORS['--color-primary'],
      '--color-accent': dto.color_accent || DEFAULT_LIGHT_COLORS['--color-accent'],
    };
  }

  private loadFromStorage(): void {
    const storedTheme = localStorage.getItem(this.THEME_KEY);
    if (storedTheme) {
      try {
        const parsed = JSON.parse(storedTheme);
        this.lightThemeSignal.set(parsed.light || DEFAULT_LIGHT_COLORS);
        this.darkThemeSignal.set(parsed.dark || DEFAULT_DARK_COLORS);
      } catch (e) { console.error('Error loading theme colors', e); }
    }

    const storedEmotions = localStorage.getItem(this.EMOTION_KEY);
    if (storedEmotions) {
      try {
        this.emotionColorsSignal.set(JSON.parse(storedEmotions));
      } catch (e) { console.error('Error loading emotion colors', e); }
    }
  }

  saveThemeColors(light: Record<string, string>, dark: Record<string, string>): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const themeColors = { light, dark };
    localStorage.setItem(this.THEME_KEY, JSON.stringify(themeColors));
    this.lightThemeSignal.set({ ...light });
    this.darkThemeSignal.set({ ...dark });
  }

  getThemeColors(): { light: Record<string, string>, dark: Record<string, string> } {
    return { light: this.lightThemeSignal(), dark: this.darkThemeSignal() };
  }

  saveEmotionColors(colors: Record<string, string>): void {
    if (!isPlatformBrowser(this.platformId)) return;
    localStorage.setItem(this.EMOTION_KEY, JSON.stringify(colors));
    this.emotionColorsSignal.set({ ...colors });
  }

  getEmotionColors(): Record<string, string> {
    return this.emotionColorsSignal();
  }

  applyThemeColors(light: Record<string, string>, dark: Record<string, string>): void {
    if (!isPlatformBrowser(this.platformId)) return;

    Object.entries(light).forEach(([variable, value]) => {
      document.documentElement.style.setProperty(variable, value);
    });

    let styleEl = document.getElementById('emotra-dark-colors') as HTMLStyleElement;
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = 'emotra-dark-colors';
      document.head.appendChild(styleEl);
    }

    const darkVars = Object.entries(dark)
      .map(([variable, value]) => `${variable}: ${value} !important;`)
      .join('\n');

    styleEl.textContent = `
      [data-theme="dark"], .dark {
        ${darkVars}
      }
    `;
  }

  applyEmotionColors(colors: Record<string, string>): void {
    if (!isPlatformBrowser(this.platformId)) return;

    Object.entries(colors).forEach(([name, value]) => {
      document.documentElement.style.setProperty(`--emotion-${name}`, value);
    });
  }

  resetThemeColors(): { light: Record<string, string>, dark: Record<string, string> } {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem(this.THEME_KEY);
    }
    const defaults = { light: DEFAULT_LIGHT_COLORS, dark: DEFAULT_DARK_COLORS };
    this.lightThemeSignal.set({ ...defaults.light });
    this.darkThemeSignal.set({ ...defaults.dark });
    return defaults;
  }

  resetEmotionColors(): Record<string, string> {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem(this.EMOTION_KEY);
    }
    const defaults = DEFAULT_EMOTION_COLORS;
    this.emotionColorsSignal.set({ ...defaults });
    return defaults;
  }
}
