import { ApplicationConfig, provideZoneChangeDetection, provideAppInitializer, inject } from '@angular/core';
import { provideRouter, withInMemoryScrolling } from '@angular/router';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { provideEchartsCore } from 'ngx-echarts';

import { routes } from './app.routes';
import { apiInterceptor } from './core/interceptors/api.interceptor';
import { AuthService } from './core/services/auth.service';

import { provideAnimations } from '@angular/platform-browser/animations';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes, withInMemoryScrolling({
      anchorScrolling: 'enabled',
      scrollPositionRestoration: 'enabled'
    })),
    provideHttpClient(withFetch(), withInterceptors([apiInterceptor])),
    provideEchartsCore({ echarts: () => import('echarts') }),
    provideAnimations(),
    provideAppInitializer(() => {
      const authService = inject(AuthService);
      return authService.verifySessionWithServer();
    })
  ]
};
