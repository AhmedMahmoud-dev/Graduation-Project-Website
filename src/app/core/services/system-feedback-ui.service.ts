import { Injectable, signal } from '@angular/core';
import { Subject } from 'rxjs';
import { SystemFeedbackResponse } from '../models/feedback.model';

@Injectable({
  providedIn: 'root'
})
export class SystemFeedbackUIService {
  private isOpenSignal = signal(false);
  isOpen = this.isOpenSignal.asReadonly();

  // Event stream for instant updates across components
  private feedbackUpdatedSource = new Subject<SystemFeedbackResponse>();
  feedbackUpdated$ = this.feedbackUpdatedSource.asObservable();

  open() {
    this.isOpenSignal.set(true);
  }

  close() {
    this.isOpenSignal.set(false);
  }

  notifyUpdate(feedback: SystemFeedbackResponse) {
    this.feedbackUpdatedSource.next(feedback);
  }
}
