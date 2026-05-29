import { Component, signal, inject, computed, OnInit, DestroyRef } from '@angular/core';
import { ActivatedRoute, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { AppearanceAndColorsComponent } from './components/appearance-and-colors/appearance-and-colors.component';
import { AccountSettingsComponent } from './components/account-settings/account-settings.component';
import { AlertPreferencesComponent } from './components/alert-preferences/alert-preferences.component';
import { FooterSectionComponent } from '../../shared/components/footer/footer.component';
import { PageHeaderComponent } from '../../shared/components/layout/page-header/page-header.component';
import { ToastService } from '../../core/services/toast.service';
import { SegmentedNavComponent } from '../../shared/components/segmented-nav/segmented-nav.component';
import { NotificationSettingsComponent } from './components/notification-settings/notification-settings.component';
import { ContactSupportComponent } from './components/contact-support/contact-support.component';
import { SharedLinksComponent } from './components/shared-links/shared-links.component';
import { AuthService } from '../../core/services/auth.service';


@Component({
  selector: 'app-settings',
  imports: [
    AppearanceAndColorsComponent,
    AccountSettingsComponent,
    FooterSectionComponent,
    PageHeaderComponent,
    SegmentedNavComponent,
    AlertPreferencesComponent,
    NotificationSettingsComponent,
    ContactSupportComponent,
    SharedLinksComponent,
    RouterLink,
    RouterLinkActive
  ],
  templateUrl: './app-settings.html',
  styleUrl: './app-settings.css'
})
export class SettingsComponent implements OnInit {
  private toastService = inject(ToastService);
  private authService = inject(AuthService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);

  isAdmin = this.authService.isAdmin;
  activeMainTab = signal<'colors' | 'account' | 'alerts' | 'notifications' | 'support' | 'shared'>('colors');
  activeSupportTab = signal<'form' | 'history'>('form');

  private allNavOptions = [
    { label: 'Appearance & Colors', value: 'colors' },
    { label: 'Account', value: 'account' },
    { label: 'Shared Links', value: 'shared' },
    { label: 'Alerts', value: 'alerts' },
    { label: 'Notifications', value: 'notifications' },
    { label: 'Support', value: 'support' }
  ];

  navOptions = computed(() => {
    if (this.isAdmin()) {
      return this.allNavOptions.filter(opt => opt.value === 'colors' || opt.value === 'notifications');
    }
    return this.allNavOptions;
  });

  ngOnInit() {
    this.route.paramMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(params => {
        const subPage = params.get('subPage');
        const tab = params.get('tab');

        if (tab) {
          // We are on settings/support/:tab
          this.activeMainTab.set('support');
          this.activeSupportTab.set(tab === 'history' ? 'history' : 'form');
          sessionStorage.setItem('emotra_settings_tab', 'support');
        } else if (subPage) {
          if (this.isValidTab(subPage)) {
            // Guard admin access
            if (this.isAdmin() && subPage !== 'colors' && subPage !== 'notifications') {
              this.router.navigate(['/settings/colors'], { replaceUrl: true });
            } else {
              this.activeMainTab.set(subPage as any);
              sessionStorage.setItem('emotra_settings_tab', subPage);
            }
          } else {
            this.router.navigate(['/settings/colors'], { replaceUrl: true });
          }
        }
      });
  }

  private isValidTab(tab: string): boolean {
    return ['colors', 'account', 'alerts', 'notifications', 'support', 'shared'].includes(tab);
  }

  triggerToast() {
    this.toastService.show('Settings Updated', 'Your changes have been saved successfully.', 'success', 'check');
  }

  setActiveTab(tab: string) {
    if (this.isAdmin() && tab !== 'colors' && tab !== 'notifications') return;

    if (this.isValidTab(tab)) {
      this.router.navigate(['/settings', tab]);
    }
  }
}
