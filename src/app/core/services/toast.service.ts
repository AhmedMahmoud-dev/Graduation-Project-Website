import { Injectable, signal, inject } from '@angular/core';
import { NotificationSettingsService } from './notification-settings.service';

export interface Toast {
  id: string;
  title: string;
  subtitle: string;
  icon: 'check' | 'refresh' | 'info' | 'error' | 'warning' | 'trash' | 'bell' | string;
  type?: 'success' | 'info' | 'warning' | 'error';
  isConfirmation?: boolean;
  onConfirm?: (value?: string) => void;
  onCancel?: () => void;
  confirmLabel?: string;
  cancelLabel?: string;
  requireInput?: boolean;
  expectedValue?: string;
  inputType?: 'text' | 'password';
  confirmInput?: string;
  isAlert?: boolean;
  severity?: string;
  alertType?: string;
}

export interface ConfirmToastOptions extends Partial<Toast> {
  onConfirm: (inputValue?: string) => void;
}

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  private settingsService = inject(NotificationSettingsService);
  private toastsSignal = signal<Toast[]>([]);
  toasts = this.toastsSignal.asReadonly();

  show(title: string, subtitle: string, type: Toast['type'] = 'info', icon: Toast['icon'] = 'info', options?: { duration?: number, isAlert?: boolean, severity?: string, alertType?: string }) {
    // Respect global enabled setting
    if (!this.settingsService.settings().enabled) return;

    const id = Math.random().toString(36).substring(2, 9);
    const newToast: Toast = {
      id,
      title,
      subtitle,
      icon,
      type,
      isAlert: options?.isAlert,
      severity: options?.severity,
      alertType: options?.alertType
    };

    this.addToast(newToast);

    // Use dynamic duration from settings, unless an explicit override is provided in options
    const duration = options?.duration || this.settingsService.settings().toastDuration;

    setTimeout(() => {
      this.dismiss(id);
    }, duration);
  }

  confirm(title: string, subtitle: string, onConfirm: (value?: string) => void, options?: Partial<Toast>) {
    // Prevent opening multiple confirmations. User must resolve the current one first.
    if (this.toastsSignal().some(t => t.isConfirmation)) return;

    const id = Math.random().toString(36).substring(2, 9);
    const newToast: Toast = {
      id,
      title,
      subtitle,
      icon: options?.icon || 'warning',
      isConfirmation: true,
      onConfirm,
      onCancel: options?.onCancel,
      confirmLabel: options?.confirmLabel || 'Confirm',
      cancelLabel: options?.cancelLabel || 'Cancel',
      type: options?.type || 'warning',
      requireInput: options?.requireInput,
      expectedValue: options?.expectedValue,
      inputType: options?.inputType || 'text'
    };

    this.addToast(newToast);
  }

  private addToast(newToast: Toast) {
    this.toastsSignal.update(toasts => {
      const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

      // Use dynamic limit from settings
      const userLimit = this.settingsService.settings().maxNotifications;
      const limit = isMobile ? Math.min(2, userLimit) : userLimit;

      // NEW notifications on TOP
      let updated = [newToast, ...toasts];

      if (updated.length > limit) {
        // Find oldest ephemeral toast to remove (now at the END of the array mostly, but better to search)
        // Since we prepend, the "oldest" ones are at the end.
        let ephemeralIndex = -1;
        for (let i = updated.length - 1; i >= 0; i--) {
          if (!updated[i].isConfirmation && updated[i].severity !== 'critical' && updated[i].id !== newToast.id) {
            ephemeralIndex = i;
            break;
          }
        }

        if (ephemeralIndex !== -1) {
          updated.splice(ephemeralIndex, 1);
        } else {
          // If everything is critical/confirm, remove the last one that isn't the new one
          updated = updated.slice(0, limit);
        }
      }

      return updated;
    });
  }

  dismiss(id: string) {
    this.toastsSignal.update(toasts => toasts.filter(t => t.id !== id));
  }

  clearAll() {
    this.toastsSignal.set([]);
  }
}

