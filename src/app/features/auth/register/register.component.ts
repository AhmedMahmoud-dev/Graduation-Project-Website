import { Component, inject, signal } from '@angular/core';

import { ReactiveFormsModule, FormBuilder, Validators, AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { FormFieldErrorComponent } from '../../../shared/components/form/form-field-error/form-field-error.component';
import { PasswordInputComponent } from '../../../shared/components/form/password-input/password-input.component';

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
  imports: [ReactiveFormsModule, RouterModule, FormFieldErrorComponent, PasswordInputComponent],
  templateUrl: './app-register.html',
  styleUrl: './app-register.css'
})
export class RegisterComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  private toastService = inject(ToastService);

  registerForm = this.fb.nonNullable.group({
    first_name: ['', [Validators.required, Validators.minLength(2)]],
    last_name: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    confirmPassword: ['', [Validators.required]],
    terms: [false, [Validators.requiredTrue]]
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
          setTimeout(() => {
            this.router.navigate(['/auth/login']);
          }, 2000);
        },
        error: (err) => {
          this.isLoading = false;
          this.registerForm.enable();

          if (err.validationErrors) {
            this.validationErrors.set(err.validationErrors);
            this.toastService.show('Form Errors', err.message || 'Please correct the highlighted errors.', 'error', 'error');
          } else {
            this.toastService.show('Error', err.message || 'Registration failed.', 'error', 'error');
          }
        }
      });
    } else {
      this.registerForm.markAllAsTouched();
    }
  }
}
