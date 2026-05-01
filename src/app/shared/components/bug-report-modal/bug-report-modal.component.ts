import { Component, inject, signal, output, OnInit, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BugReportService, BugReportPayload } from '../../../core/services/bug-report.service';
import { ToastService } from '../../../core/services/toast.service';
import { DropdownMenuComponent, DropdownOption } from '../dropdown-menu/dropdown-menu.component';

@Component({
  selector: 'app-bug-report-modal',
  standalone: true,
  imports: [FormsModule, DropdownMenuComponent],
  templateUrl: './bug-report-modal.component.html',
  styleUrl: './bug-report-modal.component.css'
})
export class BugReportModalComponent implements OnInit, OnDestroy {
  private bugReportService = inject(BugReportService);
  private toastService = inject(ToastService);

  closed = output<void>();

  ngOnInit(): void {
    // Lock scroll when modal opens
    document.body.style.overflow = 'hidden';
  }

  ngOnDestroy(): void {
    // Restore scroll when modal closes
    document.body.style.overflow = 'auto';
  }

  // Form fields
  title = signal('');
  description = signal('');
  category = signal('UI/UX');
  priority = signal('Medium');

  // State
  submitting = signal(false);

  categoryOptions: DropdownOption[] = [
    { label: 'UI/UX', value: 'UI/UX' },
    { label: 'Analysis Error', value: 'Analysis Error' },
    { label: 'Login Issue', value: 'Login Issue' },
    { label: 'Performance', value: 'Performance' },
    { label: 'Data Issue', value: 'Data Issue' },
    { label: 'Other', value: 'Other' }
  ];

  priorityOptions: DropdownOption[] = [
    { label: 'Low', value: 'Low' },
    { label: 'Medium', value: 'Medium' },
    { label: 'High', value: 'High' }
  ];

  get isValid(): boolean {
    return this.title().trim().length >= 3 && this.description().trim().length >= 10;
  }

  close(): void {
    this.closed.emit();
  }

  private getBrowserName(): string {
    const agent = window.navigator.userAgent.toLowerCase();
    if (agent.includes('edg/')) return 'Edge';
    if (agent.includes('chrome')) return 'Chrome';
    if (agent.includes('firefox')) return 'Firefox';
    if (agent.includes('safari')) return 'Safari';
    if (agent.includes('opr')) return 'Opera';
    if (agent.includes('trident')) return 'IE';
    return 'Other';
  }

  submit(): void {
    if (!this.isValid || this.submitting()) return;

    this.submitting.set(true);

    const payload: BugReportPayload = {
      title: this.title().trim(),
      description: this.description().trim(),
      category: this.category(),
      priority: this.priority(),
      metadata: {
        viewport: `${window.innerWidth}x${window.innerHeight} (${window.devicePixelRatio}x)`,
        browser: this.getBrowserName(),
        url: window.location.href,
        timestamp: new Date().toISOString()
      }
    };

    this.bugReportService.submit(payload).subscribe({
      next: (res) => {
        this.submitting.set(false);
        if (res.is_success) {
          this.toastService.show(
            'Bug Report Sent',
            'Thank you for helping us improve Emotra!',
            'success',
            'check'
          );
          this.close();
        } else {
          this.toastService.show(
            'Submission Failed',
            res.message || 'Please try again later.',
            'error',
            'error'
          );
        }
      },
      error: (err) => {
        this.submitting.set(false);
        this.toastService.show(
          'Submission Failed',
          err.message || 'Something went wrong. Please try again.',
          'error',
          'error'
        );
      }
    });
  }
}
