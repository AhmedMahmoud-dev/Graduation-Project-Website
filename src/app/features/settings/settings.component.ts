import { Component, signal, inject, computed } from '@angular/core';

import { AppearanceAndColorsComponent } from './components/appearance-and-colors/appearance-and-colors.component';
import { AccountSettingsComponent } from './components/account-settings/account-settings.component';
import { AlertPreferencesComponent } from './components/alert-preferences/alert-preferences.component';
import { FooterSectionComponent } from '../../shared/components/footer/footer.component';
import { PageHeaderComponent } from '../../shared/components/layout/page-header/page-header.component';
import { ToastService } from '../../core/services/toast.service';
import { SegmentedNavComponent } from '../../shared/components/segmented-nav/segmented-nav.component';
import { NotificationSettingsComponent } from './components/notification-settings/notification-settings.component';
import { AuthService } from '../../core/services/auth.service';


@Component({
  selector: 'app-settings',
  imports: [AppearanceAndColorsComponent, AccountSettingsComponent, FooterSectionComponent, PageHeaderComponent, SegmentedNavComponent, AlertPreferencesComponent, NotificationSettingsComponent],
  templateUrl: './app-settings.html',
  styleUrl: './app-settings.css'
})
export class SettingsComponent {
  private toastService = inject(ToastService);
  private authService = inject(AuthService);

  isAdmin = this.authService.isAdmin;
  activeMainTab = signal<'colors' | 'account' | 'alerts' | 'notifications'>('colors');

  private allNavOptions = [
    { label: 'Appearance & Colors', value: 'colors' },
    { label: 'Account', value: 'account' },
    { label: 'Alerts', value: 'alerts' },
    { label: 'Notifications', value: 'notifications' }
  ];

  // Admins see "Appearance & Colors" and "Notifications"; standard users see all tabs
  navOptions = computed(() =>
    this.isAdmin()
      ? this.allNavOptions.filter(o => o.value === 'colors' || o.value === 'notifications')
      : this.allNavOptions
  );

  ngOnInit() {
    const savedTab = sessionStorage.getItem('emotra_settings_tab');
    
    if (savedTab === 'colors' || savedTab === 'account' || savedTab === 'alerts' || savedTab === 'notifications') {
      // For admins, only allow colors and notifications
      if (this.isAdmin() && savedTab !== 'colors' && savedTab !== 'notifications') {
        this.activeMainTab.set('colors');
      } else {
        this.activeMainTab.set(savedTab);
      }
    } else {
      // Default fallback
      this.activeMainTab.set('colors');
    }
  }

  triggerToast() {
    this.toastService.show('Settings Updated', 'Your changes have been saved successfully.', 'success', 'check');
  }

  setActiveTab(tab: string) {
    // Admins can only use the 'colors' or 'notifications' tab
    if (this.isAdmin() && tab !== 'colors' && tab !== 'notifications') return;

    if (tab === 'colors' || tab === 'account' || tab === 'alerts' || tab === 'notifications') {
      this.activeMainTab.set(tab);
      sessionStorage.setItem('emotra_settings_tab', tab);
    }
  }
}
