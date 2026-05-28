import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppIconComponent } from '../app-icon/app-icon.component';

@Component({
  selector: 'app-load-more',
  standalone: true,
  imports: [CommonModule, AppIconComponent],
  templateUrl: './load-more.component.html',
  styleUrl: './load-more.component.css'
})
export class LoadMoreComponent {
  isLoadingMore = input.required<boolean>();
  searchQuery = input<string>('');
  remainingCount = input.required<number>();
  label = input<string>('Items');

  loadMore = output<void>();

  onLoadMore(): void {
    if (this.isLoadingMore()) return;
    this.loadMore.emit();
  }
}
