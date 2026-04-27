import { Component, inject, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ColorSettingsService } from './core/services/color-settings.service';
import { AuthService } from './core/services/auth.service';
import { ToastComponent } from './shared/components/toast/toast.component';
import { FaviconService } from './core/services/favicon.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, ToastComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit {
  title = 'emotra';
  private colorSettingsService = inject(ColorSettingsService);
  private authService = inject(AuthService);
  private faviconService = inject(FaviconService); // Initialize dynamic favicon

  ngOnInit(): void {
    // Initial application of colors is already handled by effects in ColorSettingsService
    // We just need to trigger a sync if the user is logged in
    if (this.authService.isAuthenticated()) {
      this.colorSettingsService.syncWithBackend();
    }
  }
}
