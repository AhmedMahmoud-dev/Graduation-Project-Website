import { Routes } from '@angular/router';
import { LandingComponent } from './features/landing/landing.component';
import { ImageModelComponent } from './features/models/image-model/image-model.component';
import { VideoModelComponent } from './features/models/video-model/video-model.component';
import { TextModelComponent } from './features/models/text-model/text-model.component';
import { AudioModelComponent } from './features/models/audio-model/audio-model.component';
import { AuthLayoutComponent } from './layouts/auth-layout/auth-layout.component';
import { LoginComponent } from './features/auth/login/login.component';
import { RegisterComponent } from './features/auth/register/register.component';
import { ForgotPasswordComponent } from './features/auth/forgot-password/forgot-password.component';
import { AppLayoutComponent } from './layouts/app-layout/app-layout.component';
import { DashboardComponent } from './features/dashboard/dashboard.component';
import { AnalysisComponent } from './features/analysis/analysis.component';
import { HistoryComponent } from './features/history/history.component';
import { AlertsComponent } from './features/alerts/alerts.component';
import { SettingsComponent } from './features/settings/settings.component';
import { authGuard, guestGuard, resetPasswordGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  // Public Route (Marketing)
  { path: '', component: LandingComponent, pathMatch: 'full' },

  // Model Documentation (Public but with App Sidebar Layout)
  {
    path: 'models',
    component: AppLayoutComponent,
    children: [
      { path: 'text', component: TextModelComponent },
      { path: 'audio', component: AudioModelComponent },
      { path: 'image', component: ImageModelComponent },
      { path: 'video', component: VideoModelComponent }
    ]
  },

  // Auth Routes
  {
    path: 'auth',
    component: AuthLayoutComponent,
    canActivate: [guestGuard],
    children: [
      { path: 'login', component: LoginComponent },
      { path: 'register', component: RegisterComponent },
      { path: 'forgot-password', component: ForgotPasswordComponent },
      { path: 'reset-password', canActivate: [resetPasswordGuard], loadComponent: () => import('./features/auth/reset-password/reset-password.component').then(m => m.ResetPasswordComponent) },
      { path: '', redirectTo: 'login', pathMatch: 'full' }
    ]
  },

  // Protected App Routes
  {
    path: '',
    component: AppLayoutComponent,
    canActivate: [authGuard],
    children: [
      { path: 'dashboard', component: DashboardComponent },
      {
        path: 'analysis',
        component: AnalysisComponent,
      },
      {
        path: 'analysis/text',
        loadComponent: () => import('./features/analysis/text/text-analysis/text-analysis.component').then(m => m.TextAnalysisComponent)
      },
      {
        path: 'analysis/text/:id',
        loadComponent: () => import('./features/analysis/text/text-analysis/text-analysis.component').then(m => m.TextAnalysisComponent)
      },
      {
        path: 'analysis/audio',
        loadComponent: () => import('./features/analysis/audio/audio-analysis/audio-analysis.component').then(m => m.AudioAnalysisComponent)
      },
      {
        path: 'analysis/audio/:id',
        loadComponent: () => import('./features/analysis/audio/audio-analysis/audio-analysis.component').then(m => m.AudioAnalysisComponent)
      },
      { path: 'history', component: HistoryComponent },
      {
        path: 'compare',
        loadComponent: () => import('./features/compare/compare/compare.component').then(m => m.CompareComponent)
      },
      { path: 'alerts', component: AlertsComponent },
      { path: 'settings', component: SettingsComponent }
    ]
  },

  // Fallback
  { path: '**', redirectTo: '' }
];
