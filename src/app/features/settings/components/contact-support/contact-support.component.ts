import { Component, inject, signal, OnInit, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { SupportService } from '../../../../core/services/support.service';
import { ToastService } from '../../../../core/services/toast.service';
import { FormattingService } from '../../../../core/services/formatting.service';
import { AlertsService } from '../../../../core/services/alerts.service';
import { SupportMessage } from '../../../../core/models/support.model';
import { LoadingStateComponent } from '../../../../shared/components/loading-state/loading-state.component';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { SegmentedNavComponent, SegmentedNavOption } from '../../../../shared/components/segmented-nav/segmented-nav.component';

@Component({
  selector: 'app-contact-support',
  standalone: true,
  imports: [CommonModule, FormsModule, LoadingStateComponent, EmptyStateComponent, SegmentedNavComponent],
  templateUrl: './contact-support.component.html',
  styleUrls: ['./contact-support.component.css']
})
export class ContactSupportComponent implements OnInit {
  private supportService = inject(SupportService);
  private toastService = inject(ToastService);
  private formattingService = inject(FormattingService);
  private alertsService = inject(AlertsService);
  private destroyRef = inject(DestroyRef);

  messages = signal<SupportMessage[]>([]);
  isLoading = signal(false);
  isSending = signal(false);
  subject = signal('');
  message = signal('');
  activeView = signal<'form' | 'history'>('form');

  navOptions = signal<SegmentedNavOption[]>([
    { label: 'Send Message', value: 'form' },
    { label: 'My Messages', value: 'history' }
  ]);

  ngOnInit() {
    this.loadMessages();
    this.setupRealTimeListener();
  }

  private setupRealTimeListener() {
    this.alertsService.alert$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((alert) => {
        // If we get a support reply alert, reload the message history instantly
        if (alert.type === 'support_reply' || alert.type === 'SupportReply') {
          this.loadMessages();
        }
      });
  }

  loadMessages() {
    this.isLoading.set(true);
    this.supportService.getMyMessages().subscribe({
      next: (res) => {
        if (res.is_success && res.data) {
          this.messages.set(res.data);
        }
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
      }
    });
  }

  submitMessage() {
    const sub = this.subject().trim();
    const msg = this.message().trim();

    if (!sub || !msg) {
      this.toastService.show('Missing Fields', 'Please enter both a subject and a message.', 'warning', 'info');
      return;
    }

    this.isSending.set(true);
    this.supportService.submitMessage({ subject: sub, message: msg }).subscribe({
      next: (res) => {
        this.isSending.set(false);
        this.toastService.show('Message Sent', 'Your support request has been submitted successfully.', 'success', 'check');
        
        // Clear form
        this.subject.set('');
        this.message.set('');
        
        // Reload history and switch view
        this.loadMessages();
        this.activeView.set('history');
      },
      error: (err) => {
        this.isSending.set(false);
        const errorMsg = err.error?.message || 'Failed to send message. Please try again.';
        this.toastService.show('Error', errorMsg, 'error', 'error');
      }
    });
  }

  formatDate(dateStr: string | null): string {
    return this.formattingService.formatDate(dateStr);
  }
}
