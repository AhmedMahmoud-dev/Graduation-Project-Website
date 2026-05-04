import { Component, inject, OnInit, signal } from '@angular/core';

import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { PasswordInputComponent } from '../../../shared/components/form/password-input/password-input.component';
import { FormFieldErrorComponent } from '../../../shared/components/form/form-field-error/form-field-error.component';
import { TooltipComponent } from '../../../shared/components/tooltip/tooltip.component';
import { FormattingService } from '../../../core/services/formatting.service';
import { CommonModule } from '@angular/common';
import { BanDetails } from '../../../core/models/api-response.model';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, RouterModule, PasswordInputComponent, FormFieldErrorComponent, TooltipComponent, CommonModule],
  templateUrl: './app-login.html',
  styleUrl: './app-login.css'
})
export class LoginComponent implements OnInit {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  private toastService = inject(ToastService);
  protected format = inject(FormattingService);

  banDetails = signal<BanDetails | null>(null);
  accountDeleted = signal(false);

  ngOnInit() {
    // Check for Ban Details
    const details = this.authService.getBanDetails();
    if (details) {
      this.banDetails.set(details);
      // Clear from storage so it doesn't show up again if they refresh
      this.authService.clearBanDetails();
    }

    // Check for Account Deletion
    if (typeof window !== 'undefined' && sessionStorage.getItem('emotra_account_deleted') === 'true') {
      this.accountDeleted.set(true);
      sessionStorage.removeItem('emotra_account_deleted');
    }
  }

  dismissBanNotice() {
    this.banDetails.set(null);
  }

  dismissAccountDeletedNotice() {
    this.accountDeleted.set(false);
  }

  loginForm = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required]
  });

  isLoading = false;

  onSubmit() {
    if (this.loginForm.valid) {
      this.isLoading = true;
      this.loginForm.disable();

      const { email, password } = this.loginForm.getRawValue();
      this.authService.login(email, password).subscribe({
        next: (res) => {
          this.toastService.show(res.message || 'Welcome Back', 'Redirecting to your dashboard...', 'success', 'check');

          const isAdmin = res.data?.roles?.includes('ADMIN');
          this.router.navigate([isAdmin ? '/admin/dashboard' : '/dashboard']);
        },
        error: (err) => {
          this.isLoading = false;
          this.loginForm.enable();

          // Handle Ban Response (403)
          if (err.status === 403 && err.error?.data?.ban_reason) {
            const details: BanDetails = err.error.data;
            this.authService.storeBanDetails(details);
            this.banDetails.set(details);
            this.authService.clearBanDetails(); // Clear after setting local signal
            return;
          }

          this.toastService.show('Login Failed', err.message || 'Please check your credentials and try again.', 'error', 'error');
        }
      });
    } else {
      this.loginForm.markAllAsTouched();
    }
  }
}
