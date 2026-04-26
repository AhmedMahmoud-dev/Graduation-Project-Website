import { Component, inject } from '@angular/core';

import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { PasswordInputComponent } from '../../../shared/components/form/password-input/password-input.component';
import { FormFieldErrorComponent } from '../../../shared/components/form/form-field-error/form-field-error.component';
import { TooltipComponent } from '../../../shared/components/tooltip/tooltip.component';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, RouterModule, PasswordInputComponent, FormFieldErrorComponent, TooltipComponent],
  templateUrl: './app-login.html',
  styleUrl: './app-login.css'
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  private toastService = inject(ToastService);

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
          this.router.navigate(['/dashboard']);
        },
        error: (err) => {
          this.isLoading = false;
          this.loginForm.enable();
          this.toastService.show('Login Failed', err.message || 'Please check your credentials and try again.', 'error', 'error');
        }
      });
    } else {
      this.loginForm.markAllAsTouched();
    }
  }
}
