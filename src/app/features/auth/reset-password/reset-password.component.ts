import { Component, inject, OnInit } from '@angular/core';

import { ReactiveFormsModule, FormBuilder, Validators, AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { PasswordInputComponent } from '../../../shared/components/form/password-input/password-input.component';
import { FormFieldErrorComponent } from '../../../shared/components/form/form-field-error/form-field-error.component';

function passwordMatchValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const password = control.get('new_password');
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
  selector: 'app-reset-password',
  standalone: true,
  imports: [ReactiveFormsModule, RouterModule, PasswordInputComponent, FormFieldErrorComponent],
  templateUrl: './app-reset-password.html',
  styleUrl: './app-reset-password.css'
})
export class ResetPasswordComponent implements OnInit {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private toastService = inject(ToastService);

  resetForm = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    code: ['', [Validators.required, Validators.pattern('^[0-9]{6}$')]],
    new_password: ['', [Validators.required, Validators.minLength(6)]],
    confirmPassword: ['', [Validators.required]]
  }, { validators: passwordMatchValidator() });

  isLoading = false;

  ngOnInit() {
    const email = this.route.snapshot.queryParamMap.get('email');
    if (email) {
      this.resetForm.patchValue({ email });
    }
  }

  onSubmit() {
    if (this.resetForm.valid) {
      this.isLoading = true;
      this.resetForm.disable();

      const { email, code, new_password } = this.resetForm.getRawValue();
      this.authService.resetPassword(email, code, new_password).subscribe({
        next: (res) => {
          this.toastService.show('Success', res.message || 'Password reset successfully!', 'success', 'check');
          this.isLoading = false;
          setTimeout(() => {
            this.router.navigate(['/auth/login']);
          }, 2000);
        },
        error: (err) => {
          this.isLoading = false;
          this.resetForm.enable();
          this.toastService.show('Error', err.message || 'Unable to reset your password.', 'error', 'error');
        }
      });
    } else {
      this.resetForm.markAllAsTouched();
    }
  }
}
