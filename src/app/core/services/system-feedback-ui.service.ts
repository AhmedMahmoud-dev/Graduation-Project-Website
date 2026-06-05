import { Injectable, signal } from '@angular/core';
import { Subject } from 'rxjs';
import { SystemFeedbackResponse } from '../models/feedback.model';

@Injectable({
  providedIn: 'root'
})
export class SystemFeedbackUIService {
  private isOpenSignal = signal(false);
  isOpen = this.isOpenSignal.asReadonly();

  // Signal to control if the Rate button is toggled off (hidden) by the user
  private isRateButtonHiddenSignal = signal<boolean>(false);
  isRateButtonHidden = this.isRateButtonHiddenSignal.asReadonly();

  // Event stream for instant updates across components
  private feedbackUpdatedSource = new Subject<SystemFeedbackResponse>();
  feedbackUpdated$ = this.feedbackUpdatedSource.asObservable();

  constructor() {
    if (typeof window !== 'undefined' && window.localStorage) {
      const stored = localStorage.getItem('emotra_rate_button_hidden');
      this.isRateButtonHiddenSignal.set(stored === 'true');
    }
  }

  open() {
    this.isOpenSignal.set(true);
  }

  close() {
    this.isOpenSignal.set(false);
  }

  toggleRateButtonVisibility() {
    const nextVal = !this.isRateButtonHiddenSignal();
    this.isRateButtonHiddenSignal.set(nextVal);
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem('emotra_rate_button_hidden', nextVal.toString());
    }
  }

  notifyUpdate(feedback: SystemFeedbackResponse) {
    this.feedbackUpdatedSource.next(feedback);
  }
}
