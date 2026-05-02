import { Component, inject } from '@angular/core';

import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { FormFieldErrorComponent } from '../../../shared/components/form/form-field-error/form-field-error.component';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [ReactiveFormsModule, RouterModule, FormFieldErrorComponent],
  templateUrl: './app-forgot-password.html',
  styleUrl: './app-forgot-password.css'
})
export class ForgotPasswordComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  private toastService = inject(ToastService);

  forgotForm = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]]
  });

  isLoading = false;

  onSubmit() {
    if (this.forgotForm.valid) {
      this.isLoading = true;
      this.forgotForm.disable();

      const { email } = this.forgotForm.getRawValue();
      this.authService.forgotPassword(email).subscribe({
        next: (res) => {
          this.toastService.show('Success', res.message || 'Reset code sent to your email.', 'success', 'check');
          this.isLoading = false;
          this.router.navigate(['/auth/reset-password'], {
            queryParams: { email }
          });
        },
        error: (err) => {
          this.isLoading = false;
          this.forgotForm.enable();
          
          this.toastService.show(
            'Error', 
            err.message || 'Unable to process your request.', 
            'error', 
            'error'
          );
        }
      });
    } else {
      this.forgotForm.markAllAsTouched();
    }
  }
}
