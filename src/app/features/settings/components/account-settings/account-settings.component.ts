import { Component, inject, signal, Output, EventEmitter } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../../core/services/auth.service';
import { ToastService } from '../../../../core/services/toast.service';

@Component({
  selector: 'app-account-settings',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './account-settings.component.html'
})
export class AccountSettingsComponent {
  public authService = inject(AuthService);
  private toastService = inject(ToastService);

  @Output() passwordChanged = new EventEmitter<void>();

  // Password reset state
  passwordResetStep = signal(false);
  isResetLoading = signal(false);
  resetCode = '';
  newPassword = '';

  sendResetCode() {
    const email = this.authService.currentUser()?.email;
    if (!email) {
      this.toastService.show('Error', 'User email not found. Please log in again.', 'error', 'error');
      return;
    }

    this.isResetLoading.set(true);
    this.authService.forgotPassword(email).subscribe({
      next: (res) => {
        this.isResetLoading.set(false);
        this.passwordResetStep.set(true);
        this.toastService.show('Code Sent', res.message || 'Check your email for the reset code', 'success', 'check');
      },
      error: (err) => {
        this.isResetLoading.set(false);
        
        const errorMsg = err.validationErrors ? 
          Object.values(err.validationErrors).flat()[0] as string : 
          (err.message || 'Failed to send reset code');
        
        this.toastService.show('Error', errorMsg, 'error', 'error');
      }
    });
  }

  confirmPasswordReset() {
    const email = this.authService.currentUser()?.email;
    if (!email || !this.resetCode || !this.newPassword) {
      this.toastService.show('Missing Fields', 'Please enter the reset code and your new password.', 'warning', 'info');
      return;
    }

    this.isResetLoading.set(true);
    this.authService.resetPassword(email, this.resetCode, this.newPassword).subscribe({
      next: (res) => {
        this.isResetLoading.set(false);
        this.passwordResetStep.set(false);
        this.resetCode = '';
        this.newPassword = '';
        this.passwordChanged.emit();
        this.toastService.show('Success', res.message || 'Your password has been reset', 'success', 'check');
      },
      error: (err) => {
        this.isResetLoading.set(false);
        const errorMsg = err.validationErrors ?
          Object.values(err.validationErrors).flat()[0] as string :
          (err.message || 'Invalid code or password requirements not met');

        this.toastService.show('Error', errorMsg, 'error', 'error');
      }
    });
  }
}
