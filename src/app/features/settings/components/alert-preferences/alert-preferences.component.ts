import { Component, inject, signal, Output, EventEmitter, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AlertsService } from '../../../../core/services/alerts.service';
import { AlertSettings } from '../../../../core/models/alert.model';
import { ToastService } from '../../../../core/services/toast.service';
import { AppCacheService } from '../../../../core/services/app-cache.service';
import { DropdownMenuComponent } from '../../../../shared/components/dropdown-menu/dropdown-menu.component';
import { finalize } from 'rxjs/operators';

@Component({
  selector: 'app-alert-preferences',
  standalone: true,
  imports: [CommonModule, FormsModule, DropdownMenuComponent],
  templateUrl: './alert-preferences.component.html',
  styleUrl: './alert-preferences.component.css'
})
export class AlertPreferencesComponent {
  private alertsService = inject(AlertsService);
  private toastService = inject(ToastService);
  private cache = inject(AppCacheService);

  @Output() settingsChanged = new EventEmitter<void>();
  isSaving = signal(false);
  isLoading = signal(true);

  settings = signal<AlertSettings>({
    alerts_enabled: true,
    alert_negative_threshold: 0.7,
    alert_consecutive_count: 2,
    alert_severity_level: 'medium',
    push_notifications: true,
    email_notifications: false
  });

  private initialSettings = signal<string>('');

  isDirty = computed(() => {
    return JSON.stringify(this.settings()) !== this.initialSettings();
  });

  severityOptions = [
    { label: 'Critical', value: 'critical' },
    { label: 'High', value: 'high' },
    { label: 'Medium', value: 'medium' },
    { label: 'Low', value: 'low' }
  ];

  constructor() {
    this.loadCurrentSettings();
  }

  private loadCurrentSettings() {
    this.isLoading.set(true);
    const parsed = this.cache.getItem<AlertSettings>('emotra_alert_settings');

    if (parsed) {
      this.settings.set(parsed);
      this.initialSettings.set(JSON.stringify(parsed));
      this.isLoading.set(false);
      return;
    }

    // Fallback to fetch from API
    this.alertsService.fetchSettings();
    setTimeout(() => {
      const fallback = this.cache.getItem<AlertSettings>('emotra_alert_settings');
      if (fallback) {
        this.settings.set(fallback);
        this.initialSettings.set(JSON.stringify(fallback));
      }
      this.isLoading.set(false);
    }, 500); // Simple delay because fetchSettings is void fire-and-forget
  }

  updateSetting<K extends keyof AlertSettings>(key: K, value: any) {
    const current = { ...this.settings() };
    if (key === 'alert_negative_threshold') {
      current[key] = parseFloat(value) as any;
    } else if (key === 'alert_consecutive_count') {
      current[key] = parseInt(value, 10) as any;
    } else {
      current[key] = value;
    }
    this.settings.set(current);
  }

  saveSettings() {
    if (!this.isDirty()) return;

    this.isSaving.set(true);
    const payload = this.settings();

    this.alertsService.updateSettings(payload)
      .pipe(finalize(() => this.isSaving.set(false)))
      .subscribe({
        next: (res: any) => {
          if (res.is_success) {
            this.cache.setItem('emotra_alert_settings', payload);
            this.initialSettings.set(JSON.stringify(payload));
            this.settingsChanged.emit();
          }
        },
        error: (err: any) => {
          this.toastService.show('Error', 'Failed to save alert preferences.', 'error', 'alert-circle');
        }
      });
  }
}
