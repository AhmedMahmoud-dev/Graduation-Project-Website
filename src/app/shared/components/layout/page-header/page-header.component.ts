import { Component, input, ContentChild, ElementRef } from '@angular/core';


@Component({
  selector: 'app-page-header',
  standalone: true,
  imports: [],
  templateUrl: './page-header.component.html',
  styleUrl: './page-header.component.css'
})
export class PageHeaderComponent {
  title = input.required<string>();
  subtitle = input<string>('');
  description = input<string>('');
  hasNav = input<boolean>(false);
}
