import { Component, signal, OnInit, AfterViewInit, OnDestroy, PLATFORM_ID, inject, HostListener } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FooterSectionComponent } from '../../../shared/components/footer/footer.component';

@Component({
  selector: 'app-image-model',
  standalone: true,
  imports: [RouterModule, FooterSectionComponent],
  templateUrl: './image-model.component.html',
  styleUrl: './image-model.component.css'
})
export class ImageModelComponent implements OnInit {
  private isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  ngOnInit() {
    if (this.isBrowser) {
      window.scrollTo(0, 0);
    }
  }
}
