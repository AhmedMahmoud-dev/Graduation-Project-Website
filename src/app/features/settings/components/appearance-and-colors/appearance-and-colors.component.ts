import { Component, inject, signal, Output, EventEmitter, effect, computed } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { ColorSettingsService, DEFAULT_LIGHT_COLORS, DEFAULT_DARK_COLORS, DEFAULT_EMOTION_COLORS, PRESET_THEMES } from '../../../../core/services/color-settings.service';
import { SegmentedNavComponent } from '../../../../shared/components/segmented-nav/segmented-nav.component';
import { SettingsApiService, AppearanceSettingsDto, ThemeColorsDto } from '../../../../core/services/settings-api.service';
import { ThemeService } from '../../../../core/services/theme.service';
import { finalize } from 'rxjs/operators';


interface ColorRow {
  label: string;
  variable: string;
  key?: string; // for emotion colors
}

@Component({
  selector: 'app-appearance-and-colors',
  standalone: true,
  imports: [FormsModule, SegmentedNavComponent],
  templateUrl: './appearance-and-colors.component.html'
})
export class AppearanceAndColorsComponent {
  private colorSettingsService = inject(ColorSettingsService);
  private settingsApi = inject(SettingsApiService);
  private themeService = inject(ThemeService);

  @Output() settingsChanged = new EventEmitter<void>();
  isSaving = signal(false);
  isLoading = signal(true);

  themeRows: ColorRow[] = [
    { label: 'Page Background', variable: '--color-bg' },
    { label: 'Card / Surface', variable: '--color-surface' },
    { label: 'Borders', variable: '--color-border' },
    { label: 'Primary Text', variable: '--color-text' },
    { label: 'Muted Text', variable: '--color-text-muted' },
    { label: 'Brand Primary', variable: '--color-primary' },
    { label: 'Accent', variable: '--color-accent' }
  ];

  emotions = ['anger', 'disgust', 'fear', 'joy', 'neutral', 'sadness', 'surprise'];
  activeThemeTab = signal<'light' | 'dark'>('light');
  modeOptions = [
    { label: 'Light', value: 'light' },
    { label: 'Dark', value: 'dark' }
  ];

  selectedPresetId = signal<string | null>(null);

  presets = PRESET_THEMES;
  tempLightColors = signal<Record<string, string>>({ ...DEFAULT_LIGHT_COLORS });
  tempDarkColors = signal<Record<string, string>>({ ...DEFAULT_DARK_COLORS });
  tempEmotions = signal<Record<string, string>>({ ...DEFAULT_EMOTION_COLORS });

  constructor() {
    this.loadCurrentSettings();

    // When the service's global signals update (e.g. after syncWithBackend),
    // we update our temporary local signals if needed.
    effect(() => {
      const light = this.colorSettingsService.lightColors();
      const dark = this.colorSettingsService.darkColors();
      const emotions = this.colorSettingsService.emotionColors();

      this.tempLightColors.set({ ...light });
      this.tempDarkColors.set({ ...dark });
      this.tempEmotions.set({ ...emotions });
      this.isLoading.set(false);
    });
  }

  isDefaultTheme = computed(() => {
    return this.areObjectsEqual(this.tempLightColors(), DEFAULT_LIGHT_COLORS) &&
      this.areObjectsEqual(this.tempDarkColors(), DEFAULT_DARK_COLORS);
  });

  isDefaultEmotions = computed(() => {
    return this.areObjectsEqual(this.tempEmotions(), DEFAULT_EMOTION_COLORS);
  });

  isAllDefault = computed(() => this.isDefaultTheme() && this.isDefaultEmotions());


  private loadCurrentSettings() {
    const theme = this.colorSettingsService.getThemeColors();
    this.tempLightColors.set({ ...theme.light });
    this.tempDarkColors.set({ ...theme.dark });

    const emotions = this.colorSettingsService.getEmotionColors();
    this.tempEmotions.set({ ...emotions });
  }

  getCurrentThemeValue(variable: string): string {
    return this.activeThemeTab() === 'light'
      ? this.tempLightColors()[variable]
      : this.tempDarkColors()[variable];
  }

  updateThemeColor(variable: string, value: string) {
    if (this.isValidHex(value)) {
      if (this.activeThemeTab() === 'light') {
        const current = { ...this.tempLightColors() };
        current[variable] = value;
        this.tempLightColors.set(current);
      } else {
        const current = { ...this.tempDarkColors() };
        current[variable] = value;
        this.tempDarkColors.set(current);
      }
      this.selectedPresetId.set(null);
    }
  }

  applyPresetTheme(presetId: string) {
    const preset = (this.presets as any[]).find(p => p.id === presetId);
    if (preset) {
      this.tempLightColors.set({ ...preset.light });
      this.tempDarkColors.set({ ...preset.dark });
      if (preset.emotions) {
        this.tempEmotions.set({ ...preset.emotions });
      }
      this.selectedPresetId.set(presetId);
    }
  }

  applyPresetAndSave(presetId: string) {
    this.applyPresetTheme(presetId);
    this.saveThemeChanges();
  }

  updateEmotionColor(emotion: string, value: string) {
    if (this.isValidHex(value)) {
      const current = { ...this.tempEmotions() };
      current[emotion] = value;
      this.tempEmotions.set(current);
      // If user manually edits an emotion color, we are no longer strictly on a pure preset
      this.selectedPresetId.set(null);
    }
  }

  private isValidHex(hex: string): boolean {
    return /^#[0-9a-fA-F]{6}$/.test(hex);
  }

  private mapCssToDto(colors: Record<string, string>): ThemeColorsDto {
    return {
      color_bg: colors['--color-bg'],
      color_surface: colors['--color-surface'],
      color_border: colors['--color-border'],
      color_text: colors['--color-text'],
      color_text_muted: colors['--color-text-muted'],
      color_primary: colors['--color-primary'],
      color_accent: colors['--color-accent']
    };
  }


  private buildPayload(): AppearanceSettingsDto {
    return {
      light_theme: this.mapCssToDto(this.tempLightColors()),
      dark_theme: this.mapCssToDto(this.tempDarkColors()),
      emotion_colors: this.tempEmotions(),
      active_theme: this.themeService.currentTheme()
    };
  }

  saveThemeChanges() {
    const current = this.colorSettingsService.getThemeColors();
    const hasChanges = !this.areObjectsEqual(current.light, this.tempLightColors()) ||
      !this.areObjectsEqual(current.dark, this.tempDarkColors());

    if (!hasChanges) return;

    this.isSaving.set(true);

    this.settingsApi.updateAppearanceSettings(this.buildPayload())
      .pipe(finalize(() => this.isSaving.set(false)))
      .subscribe({
        next: (res) => {
          if (res.is_success) {
            this.colorSettingsService.saveThemeColors(this.tempLightColors(), this.tempDarkColors());
            if (this.selectedPresetId()) {
              this.colorSettingsService.saveEmotionColors(this.tempEmotions());
            }
            this.settingsChanged.emit();
          }
        },
        error: (err) => console.error('Failed to save theme settings', err)
      });
  }

  saveEmotionChanges() {
    const current = this.colorSettingsService.getEmotionColors();
    if (this.areObjectsEqual(current, this.tempEmotions())) return;

    this.isSaving.set(true);

    this.settingsApi.updateAppearanceSettings(this.buildPayload())
      .pipe(finalize(() => this.isSaving.set(false)))
      .subscribe({
        next: (res) => {
          if (res.is_success) {
            this.colorSettingsService.saveEmotionColors(this.tempEmotions());
            this.settingsChanged.emit();
          }
        },
        error: (err) => console.error('Failed to save emotion settings', err)
      });
  }

  resetThemeToDefault() {
    if (this.isAllDefault() || this.isSaving() || this.isLoading()) return;

    this.isSaving.set(true);
    this.settingsApi.resetAppearanceSettings()
      .pipe(finalize(() => this.isSaving.set(false)))
      .subscribe({
        next: (res) => {
          if (res.is_success) {
            const defaults = this.colorSettingsService.resetThemeColors();
            // Since reset backend deletes whole row, it also resets emotion colors to default on the backend.
            // But we can just enforce local UI reset for themes. Let's fully clear.
            const defaultEmotions = this.colorSettingsService.resetEmotionColors();

            this.tempLightColors.set({ ...defaults.light });
            this.tempDarkColors.set({ ...defaults.dark });
            this.tempEmotions.set({ ...defaultEmotions });
            this.selectedPresetId.set('default');

            this.settingsChanged.emit();
          }
        },
        error: (err) => console.error('Failed to reset settings', err)
      });
  }

  resetEmotionsToDefault() {
    if (this.isDefaultEmotions() || this.isSaving() || this.isLoading()) return;

    // Only resetting emotions means we update the backend with current theme + default emotions
    const defaultEmotions = { ...DEFAULT_EMOTION_COLORS };
    this.tempEmotions.set(defaultEmotions);

    this.isSaving.set(true);
    this.settingsApi.updateAppearanceSettings(this.buildPayload())
      .pipe(finalize(() => this.isSaving.set(false)))
      .subscribe({
        next: (res) => {
          if (res.is_success) {
            this.colorSettingsService.resetEmotionColors();
            this.settingsChanged.emit();
          }
        },
        error: (err) => console.error('Failed to reset emotion settings', err)
      });
  }

  private areObjectsEqual(a: any, b: any): boolean {
    return JSON.stringify(a) === JSON.stringify(b);
  }
}
