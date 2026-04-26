import { Component } from '@angular/core';

import { RouterModule } from '@angular/router';
import { FooterSectionComponent } from '../../shared/components/footer/footer.component';
import { PageHeaderComponent } from '../../shared/components/layout/page-header/page-header.component';

@Component({
  selector: 'app-analysis',
  standalone: true,
  imports: [RouterModule, FooterSectionComponent, PageHeaderComponent],
  templateUrl: './app-analysis.html',
  styleUrl: './app-analysis.css'
})
export class AnalysisComponent { }
