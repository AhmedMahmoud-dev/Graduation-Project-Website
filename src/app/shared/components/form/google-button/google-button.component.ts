import { Component, ElementRef, EventEmitter, OnInit, Output, ViewChild, input } from '@angular/core';
import { environment } from '../../../../../environments/environment';

@Component({
  selector: 'app-google-button',
  standalone: true,
  templateUrl: './google-button.component.html',
  styleUrls: []
})
export class GoogleButtonComponent implements OnInit {
  disabled = input(false);
  @Output() credential = new EventEmitter<string>();

  @ViewChild('googleBtnContainer', { static: true }) googleBtnContainer!: ElementRef;

  ngOnInit() {
    google.accounts.id.initialize({
      client_id: environment.googleClientId,
      callback: (response: any) => {
        if (response && response.credential) {
          this.credential.emit(response.credential);
        }
      },
      auto_select: false,
      cancel_on_tap_outside: true
    });

    google.accounts.id.renderButton(
      this.googleBtnContainer.nativeElement,
      { theme: 'outline', size: 'large', width: 400 }
    );
  }
}
