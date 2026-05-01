import { Component, signal, inject, computed } from '@angular/core';

import { AppearanceAndColorsComponent } from './components/appearance-and-colors/appearance-and-colors.component';
import { AccountSettingsComponent } from './components/account-settings/account-settings.component';
import { AlertPreferencesComponent } from './components/alert-preferences/alert-preferences.component';
import { FooterSectionComponent } from '../../shared/components/footer/footer.component';
import { PageHeaderComponent } from '../../shared/components/layout/page-header/page-header.component';
import { ToastService } from '../../core/services/toast.service';
import { SegmentedNavComponent } from '../../shared/components/segmented-nav/segmented-nav.component';
import { NotificationSettingsComponent } from './components/notification-settings/notification-settings.component';
import { ContactSupportComponent } from './components/contact-support/contact-support.component';
import { AuthService } from '../../core/services/auth.service';


@Component({
  selector: 'app-settings',
  imports: [AppearanceAndColorsComponent, AccountSettingsComponent, FooterSectionComponent, PageHeaderComponent, SegmentedNavComponent, AlertPreferencesComponent, NotificationSettingsComponent, ContactSupportComponent],
  templateUrl: './app-settings.html',
  styleUrl: './app-settings.css'
})
export class SettingsComponent {
  private toastService = inject(ToastService);
  private authService = inject(AuthService);

  isAdmin = this.authService.isAdmin;
  activeMainTab = signal<'colors' | 'account' | 'alerts' | 'notifications' | 'support'>('colors');

  private allNavOptions = [
    { label: 'Appearance & Colors', value: 'colors' },
    { label: 'Account', value: 'account' },
    { label: 'Alerts', value: 'alerts' },
    { label: 'Notifications', value: 'notifications' },
    { 
      label: 'Support', 
      value: 'support', 
      icon: '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>' 
    }
  ];

  navOptions = computed(() => {
    if (this.isAdmin()) {
      return this.allNavOptions.filter(opt => opt.value === 'colors' || opt.value === 'notifications');
    }
    return this.allNavOptions;
  });

  ngOnInit() {
    const savedTab = sessionStorage.getItem('emotra_settings_tab');
    
    if (savedTab === 'colors' || savedTab === 'account' || savedTab === 'alerts' || savedTab === 'notifications' || savedTab === 'support') {
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

    if (tab === 'colors' || tab === 'account' || tab === 'alerts' || tab === 'notifications' || tab === 'support') {
      this.activeMainTab.set(tab);
      sessionStorage.setItem('emotra_settings_tab', tab);
    }
  }
}
