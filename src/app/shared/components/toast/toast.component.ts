import { Component, inject, signal, HostListener, ElementRef, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { trigger, transition, style, animate } from '@angular/animations';
import { ToastService } from '../../../core/services/toast.service';
import { NotificationSettingsService } from '../../../core/services/notification-settings.service';

@Component({
  selector: 'app-toast-container',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './toast.component.html',
  styleUrl: './toast.component.css',
  animations: [
    trigger('toastAnimation', [
      transition(':enter', [
        style({ transform: 'translateX(100%)', opacity: 0 }),
        animate('300ms cubic-bezier(0.16, 1, 0.3, 1)', style({ transform: 'translateX(0)', opacity: 1 }))
      ]),
      transition(':leave', [
        style({ opacity: 1, transform: 'translateX(0)', height: '*', margin: '*' }),
        animate('300ms cubic-bezier(0.16, 1, 0.3, 1)', style({
          transform: 'translateX(100%)',
          opacity: 0,
          height: 0,
          marginTop: 0,
          marginBottom: 0,
          paddingTop: 0,
          paddingBottom: 0
        }))
      ])
    ]),
    trigger('backdropAnimation', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('300ms ease-out', style({ opacity: 1 }))
      ]),
      transition(':leave', [
        animate('200ms ease-in', style({ opacity: 0 }))
      ])
    ])
  ]
})
export class ToastComponent {
  toastService = inject(ToastService);
  settingsService = inject(NotificationSettingsService);
  toasts = this.toastService.toasts;
  settings = this.settingsService.settings;

  // Track if any confirmation is active for the backdrop
  hasConfirmation = computed(() => this.toasts().some(t => t.isConfirmation));

  // Track input values for confirmation toasts
  confirmInputs = signal<Record<string, string>>({});

  dismiss(id: string) {
    this.toastService.dismiss(id);
  }

  cancelAllConfirmations() {
    const confirmations = this.toasts().filter(t => t.isConfirmation);
    confirmations.forEach(toast => this.handleCancel(toast));
  }

  handleConfirm(toast: any) {
    if (toast.requireInput && toast.expectedValue) {
      const val = this.confirmInputs()[toast.id] || '';
      if (val.trim() !== toast.expectedValue) return;
    }

    // Dismiss FIRST to avoid layout jumping when the new success toast appears
    this.dismiss(toast.id);

    if (toast.onConfirm) {
      // Small delay to let the confirmation toast start exiting 
      // before the next notification (potentially) slides in
      const inputValue = this.confirmInputs()[toast.id];
      setTimeout(() => {
        toast.onConfirm(inputValue);
      }, 150);
    }
  }

  isConfirmDisabled(toast: any): boolean {
    if (!toast.requireInput) return false;
    const val = this.confirmInputs()[toast.id] || '';
    
    // If expectedValue is provided, require exact match
    if (toast.expectedValue) {
      return val.trim() !== toast.expectedValue;
    }
    
    // Otherwise just require non-empty
    return val.trim().length === 0;
  }

  onInputChange(id: string, value: string) {
    this.confirmInputs.update(vals => ({ ...vals, [id]: value }));
  }

  handleCancel(toast: any) {
    if (toast.onCancel) toast.onCancel();
    this.dismiss(toast.id);
  }
}

