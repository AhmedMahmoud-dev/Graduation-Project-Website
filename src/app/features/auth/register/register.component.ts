import { Component, inject, signal, OnInit } from '@angular/core';

import { ReactiveFormsModule, FormBuilder, Validators, AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { FormFieldErrorComponent } from '../../../shared/components/form/form-field-error/form-field-error.component';
import { PasswordInputComponent } from '../../../shared/components/form/password-input/password-input.component';
import { environment } from '../../../../environments/environment';
import { BanDetails } from '../../../core/models/api-response.model';
import { GoogleButtonComponent } from '../../../shared/components/form/google-button/google-button.component';


function passwordMatchValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const password = control.get('password');
    const confirmPassword = control.get('confirmPassword');

    if (password && confirmPassword && password.value !== confirmPassword.value) {
      confirmPassword.setErrors({ passwordMismatch: true });
      return { passwordMismatch: true };
    }

    if (confirmPassword?.hasError('passwordMismatch')) {
      const errors = { ...confirmPassword.errors };
      delete errors['passwordMismatch'];
      confirmPassword.setErrors(Object.keys(errors).length ? errors : null);
    }
    return null;
  };
}

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [ReactiveFormsModule, RouterModule, FormFieldErrorComponent, PasswordInputComponent, GoogleButtonComponent],
  templateUrl: './app-register.html',
  styleUrl: './app-register.css'
})
export class RegisterComponent implements OnInit {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  private toastService = inject(ToastService);

  banDetails = signal<BanDetails | null>(null);

  ngOnInit() {
  }

  registerForm = this.fb.nonNullable.group({
    first_name: ['', [Validators.required, Validators.minLength(2)]],
    last_name: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    confirmPassword: ['', [Validators.required]]
  }, { validators: passwordMatchValidator() });

  isLoading = false;

  // Storage for .NET validation errors
  validationErrors = signal<Record<string, string[]> | null>(null);

  getFieldError(fieldName: string): string | null {
    const errs = this.validationErrors();
    if (errs && errs[fieldName] && errs[fieldName].length > 0) {
      return errs[fieldName][0];
    }
    return null;
  }

  onSubmit() {
    if (this.registerForm.valid) {
      this.isLoading = true;
      this.validationErrors.set(null);
      this.registerForm.disable();

      const { first_name, last_name, email, password } = this.registerForm.getRawValue();

      this.authService.register(email, password, first_name, last_name).subscribe({
        next: (res) => {
          this.toastService.show('Success', res.message || 'Account created successfully!', 'success', 'check');
          this.router.navigate(['/auth/login']);
        },
        error: (err) => {
          this.isLoading = false;
          this.registerForm.enable();

          if (err.validationErrors) {
            this.validationErrors.set(err.validationErrors);
            this.toastService.show('Form Errors', err.message || 'Please correct the highlighted errors.', 'error', 'error');
          } else {
            const errMsg = err.message || 'This email is already registered using Google Sign-In. Please sign in using Google.';
            this.toastService.show('Error', errMsg, 'error', 'error');
          }
        }
      });
    } else {
      this.registerForm.markAllAsTouched();
    }
  }

  handleGoogleCredential(idToken: string) {
    this.isLoading = true;
    this.registerForm.disable();

    this.authService.loginWithGoogle(idToken).subscribe({
      next: (res) => {
        if (res.data?.ban_reason) {
          this.isLoading = false;
          this.registerForm.enable();
          const details: BanDetails = {
            ban_reason: res.data.ban_reason,
            ban_expires_at: res.data.ban_expires_at,
            is_permanent: !!res.data.is_permanent
          };
          this.banDetails.set(details);
          return;
        }

        this.toastService.show(res.message || 'Welcome Back', 'Redirecting to your dashboard...', 'success', 'check');
        const isAdmin = res.data?.roles?.includes('ADMIN');
        this.router.navigate([isAdmin ? '/admin/dashboard' : '/dashboard']);
      },
      error: (err) => {
        this.isLoading = false;
        this.registerForm.enable();

        if (err.status === 403 && err.error?.data?.ban_reason) {
          const details: BanDetails = err.error.data;
          this.authService.storeBanDetails(details);
          this.banDetails.set(details);
          this.authService.clearBanDetails();
          return;
        }

        const errMsg = err.message || 'This email is registered using a password. Please sign in with your email and password.';
        this.toastService.show('Google Login Failed', errMsg, 'error', 'error');
      }
    });
  }
}
