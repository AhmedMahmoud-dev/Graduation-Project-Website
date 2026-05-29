import { Component, Input, Output, EventEmitter, ViewChildren, QueryList, ElementRef, AfterViewInit, OnChanges, SimpleChanges } from '@angular/core';


export interface SegmentedNavOption {
  label: string;
  value: string;
  icon?: string;
  disabled?: boolean;
}


@Component({
  selector: 'app-segmented-nav',
  standalone: true,
  imports: [],
  templateUrl: './segmented-nav.component.html',
  styleUrls: ['./segmented-nav.component.css']
})
export class SegmentedNavComponent implements AfterViewInit, OnChanges {
  @Input() options: SegmentedNavOption[] = [];
  @Input() selectedValue: string = '';
  @Output() selectedValueChange = new EventEmitter<string>();

  @ViewChildren('navButton') navButtons!: QueryList<ElementRef<HTMLButtonElement>>;

  private scrollTargetValue: string | null = null;
  private static savedScrollPositions = new Map<string, number>();

  private getCacheKey(): string {
    return this.options.map(o => o.value).join(',');
  }

  onScroll(event: Event) {
    const target = event.target as HTMLElement;
    if (target && this.options.length > 0) {
      SegmentedNavComponent.savedScrollPositions.set(this.getCacheKey(), target.scrollLeft);
    }
  }

  ngAfterViewInit() {
    const cachedScroll = SegmentedNavComponent.savedScrollPositions.get(this.getCacheKey());
    const parent = this.navButtons.first?.nativeElement.parentElement;
    if (parent && cachedScroll !== undefined) {
      parent.scrollLeft = cachedScroll;
      this.scrollToActive('auto');
    } else {
      this.scrollToActive('smooth');
    }
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['selectedValue'] && !changes['selectedValue'].firstChange) {
      const newValue = changes['selectedValue'].currentValue;
      if (this.scrollTargetValue === newValue) {
        this.scrollTargetValue = null;
      } else {
        this.scrollTargetValue = null;
        this.scrollToActive('smooth');
      }
    }
  }

  selectOption(option: SegmentedNavOption, element: HTMLButtonElement) {
    if (option.disabled) return;
    if (this.selectedValue !== option.value) {
      this.scrollTargetValue = option.value;
      this.selectedValue = option.value;
      this.selectedValueChange.emit(option.value);
      this.scrollToElement(element, 'smooth');
    }
  }

  private scrollToActive(behavior: ScrollBehavior = 'smooth') {
    // Small timeout to ensure view is updated and QueryList is populated
    setTimeout(() => {
      const activeButton = this.navButtons.find((btn, index) =>
        this.options[index].value === this.selectedValue
      );
      if (activeButton) {
        this.scrollToElement(activeButton.nativeElement, behavior);
      }
    }, 50);
  }

  private scrollToElement(element: HTMLElement, behavior: ScrollBehavior = 'smooth') {
    const parent = element.parentElement;
    if (!parent) return;

    // Calculate position using getBoundingClientRect to avoid offsetParent issues
    const parentRect = parent.getBoundingClientRect();
    const elementRect = element.getBoundingClientRect();
    const scrollLeft = parent.scrollLeft + (elementRect.left - parentRect.left) - (parentRect.width / 2) + (elementRect.width / 2);

    if (this.options.length > 0) {
      SegmentedNavComponent.savedScrollPositions.set(this.getCacheKey(), scrollLeft);
    }

    parent.scrollTo({
      left: scrollLeft,
      behavior
    });
  }
}

