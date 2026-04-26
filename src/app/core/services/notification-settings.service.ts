import { Injectable, signal, effect } from '@angular/core';

export interface NotificationSettings {
  enabled: boolean;
  toastDuration: number;
  alertPersistence: number; // Multiplier or fixed time for alerts
  maxNotifications: number;
  showIcons: boolean;
  soundEnabled: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationSettingsService {
  private readonly STORAGE_KEY = 'emotra_notification_settings';

  // Default settings
  private readonly DEFAULT_SETTINGS: NotificationSettings = {
    enabled: true,
    toastDuration: 5000,
    alertPersistence: 30000, // Default 30s for sticking alerts
    maxNotifications: 5,
    showIcons: true,
    soundEnabled: false
  };

  // Signals for settings
  settings = signal<NotificationSettings>(this.loadSettings());

  constructor() {
    // Persist settings whenever they change
    effect(() => {
      const currentSettings = this.settings();
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(currentSettings));
    });
  }

  private loadSettings(): NotificationSettings {
    if (typeof window === 'undefined') return this.DEFAULT_SETTINGS;
    
    const stored = localStorage.getItem(this.STORAGE_KEY);
    if (!stored) return this.DEFAULT_SETTINGS;

    try {
      const parsed = JSON.parse(stored);
      return { ...this.DEFAULT_SETTINGS, ...parsed };
    } catch {
      return this.DEFAULT_SETTINGS;
    }
  }

  updateSettings(partial: Partial<NotificationSettings>) {
    this.settings.update(s => ({ ...s, ...partial }));
  }

  resetToDefaults() {
    this.settings.set(this.DEFAULT_SETTINGS);
  }

  isDefault(): boolean {
    const current = this.settings();
    return JSON.stringify(current) === JSON.stringify(this.DEFAULT_SETTINGS);
  }
}
