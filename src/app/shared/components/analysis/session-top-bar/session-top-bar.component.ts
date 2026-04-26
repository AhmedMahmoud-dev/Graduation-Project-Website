import { Component, input, output, signal } from '@angular/core';


@Component({
  selector: 'app-session-top-bar',
  standalone: true,
  imports: [],
  templateUrl: './session-top-bar.component.html',
  styleUrl: './session-top-bar.component.css'
})
export class SessionTopBarComponent {
  /** The full session ID string */
  sessionId = input.required<string>();

  /** Emitted when "← New Analysis" is clicked */
  newAnalysis = output<void>();

  copiedId = signal<boolean>(false);

  copySessionId() {
    navigator.clipboard.writeText(this.sessionId()).then(() => {
      this.copiedId.set(true);
      setTimeout(() => this.copiedId.set(false), 2000);
    });
  }
}
