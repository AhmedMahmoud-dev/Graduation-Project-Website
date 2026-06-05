import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SuggestionService } from '../../../core/services/suggestion.service';

@Component({
  selector: 'app-smart-suggestion',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './smart-suggestion.component.html',
  styleUrl: './smart-suggestion.component.css'
})
export class SmartSuggestionComponent {
  public suggestionService = inject(SuggestionService);

  suggestion = this.suggestionService.activeSuggestion;
  shouldShow = this.suggestionService.shouldShow;

  dismiss(): void {
    this.suggestionService.dismiss();
  }

  executeAction(): void {
    this.suggestionService.executeAction();
  }
}
