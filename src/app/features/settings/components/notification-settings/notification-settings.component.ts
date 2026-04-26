import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NotificationSettingsService } from '../../../../core/services/notification-settings.service';
import { ToastService } from '../../../../core/services/toast.service';

@Component({
  selector: 'app-notification-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './notification-settings.component.html',
  styleUrl: './notification-settings.component.css'
})
export class NotificationSettingsComponent {
  private settingsService = inject(NotificationSettingsService);
  private toastService = inject(ToastService);

  settings = this.settingsService.settings;

  updateEnabled(enabled: boolean) {
    this.settingsService.updateSettings({ enabled });
    if (!enabled) {
      this.toastService.clearAll();
    } else {
      this.showPreview('Notifications Enabled', 'Your preference has been updated.');
    }
  }

  updateDuration(seconds: number) {
    this.settingsService.updateSettings({ toastDuration: seconds * 1000 });
  }

  updateMax(max: number) {
    this.settingsService.updateSettings({ maxNotifications: max });
  }

  updateAlertPersistence(seconds: number) {
    this.settingsService.updateSettings({ alertPersistence: seconds * 1000 });
  }

  updateIcons(showIcons: boolean) {
    this.settingsService.updateSettings({ showIcons });
  }

  reset() {
    this.settingsService.resetToDefaults();
    this.showPreview('Settings Reset', 'Notification preferences have been restored to defaults.', 'info', 'refresh');
  }

  showPreview(title: string, subtitle: string, type: any = 'success', icon: any = 'check') {
    this.toastService.show(title, subtitle, type, icon);
  }

  get durationInSeconds(): number {
    return this.settings().toastDuration / 1000;
  }

  get alertPersistenceInSeconds(): number {
    return this.settings().alertPersistence / 1000;
  }

  get isDefault(): boolean {
    return this.settingsService.isDefault();
  }
}
