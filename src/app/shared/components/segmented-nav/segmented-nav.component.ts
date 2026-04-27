import { Component, Input, Output, EventEmitter, ViewChildren, QueryList, ElementRef, AfterViewInit, OnChanges, SimpleChanges } from '@angular/core';


export interface SegmentedNavOption {
  label: string;
  value: string;
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

  ngAfterViewInit() {
    this.scrollToActive();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['selectedValue'] && !changes['selectedValue'].firstChange) {
      this.scrollToActive();
    }
  }

  selectOption(option: SegmentedNavOption, element: HTMLButtonElement) {
    if (option.disabled) return;
    if (this.selectedValue !== option.value) {
      this.selectedValue = option.value;
      this.selectedValueChange.emit(option.value);
      this.scrollToElement(element);
    }
  }

  private scrollToActive() {
    // Small timeout to ensure view is updated and QueryList is populated
    setTimeout(() => {
      const activeButton = this.navButtons.find((btn, index) =>
        this.options[index].value === this.selectedValue
      );
      if (activeButton) {
        this.scrollToElement(activeButton.nativeElement);
      }
    }, 50);
  }

  private scrollToElement(element: HTMLElement) {
    const parent = element.parentElement;
    if (!parent) return;

    // Calculate the position to center the element horizontally within its scrollable container
    // without triggering vertical page scrolling
    const scrollLeft = element.offsetLeft - (parent.clientWidth / 2) + (element.clientWidth / 2);

    parent.scrollTo({
      left: scrollLeft,
      behavior: 'smooth'
    });
  }
}

