import { Component, signal, inject } from '@angular/core';

import { AppearanceAndColorsComponent } from './components/appearance-and-colors/appearance-and-colors.component';
import { AccountSettingsComponent } from './components/account-settings/account-settings.component';
import { AlertPreferencesComponent } from './components/alert-preferences/alert-preferences.component';
import { FooterSectionComponent } from '../../shared/components/footer/footer.component';
import { PageHeaderComponent } from '../../shared/components/layout/page-header/page-header.component';
import { ToastService } from '../../core/services/toast.service';
import { SegmentedNavComponent } from '../../shared/components/segmented-nav/segmented-nav.component';


import { NotificationSettingsComponent } from './components/notification-settings/notification-settings.component';


@Component({
  selector: 'app-settings',
  imports: [AppearanceAndColorsComponent, AccountSettingsComponent, FooterSectionComponent, PageHeaderComponent, SegmentedNavComponent, AlertPreferencesComponent, NotificationSettingsComponent],
  templateUrl: './app-settings.html',
  styleUrl: './app-settings.css'
})
export class SettingsComponent {
  private toastService = inject(ToastService);
  activeMainTab = signal<'colors' | 'account' | 'alerts' | 'notifications'>('colors');

  ngOnInit() {
    const savedTab = sessionStorage.getItem('emotra_settings_tab');
    if (savedTab === 'colors' || savedTab === 'account' || savedTab === 'alerts' || savedTab === 'notifications') {
      this.activeMainTab.set(savedTab);
    }
  }

  navOptions = [
    { label: 'Appearance & Colors', value: 'colors' },
    { label: 'Account', value: 'account' },
    { label: 'Alerts', value: 'alerts' },
    { label: 'Notifications', value: 'notifications' }
  ];

  triggerToast() {
    this.toastService.show('Settings Updated', 'Your changes have been saved successfully.', 'success', 'check');
  }

  setActiveTab(tab: string) {
    if (tab === 'colors' || tab === 'account' || tab === 'alerts' || tab === 'notifications') {
      this.activeMainTab.set(tab);
      sessionStorage.setItem('emotra_settings_tab', tab);
    }
  }
}
