import { Component, input } from '@angular/core';

@Component({
  selector: 'app-form-field-error',
  standalone: true,
  templateUrl: './form-field-error.component.html',
})
export class FormFieldErrorComponent {
  errorText = input<string | null | undefined>();
}
