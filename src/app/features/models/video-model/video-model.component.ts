import { Component, OnInit, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FooterSectionComponent } from '../../../shared/components/footer/footer.component';

@Component({
  selector: 'app-video-model',
  standalone: true,
  imports: [RouterModule, FooterSectionComponent],
  templateUrl: './video-model.component.html',
  styleUrl: './video-model.component.css'
})
export class VideoModelComponent implements OnInit {
  private isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  ngOnInit() {
    if (this.isBrowser) {
      window.scrollTo(0, 0);
    }
  }
}
