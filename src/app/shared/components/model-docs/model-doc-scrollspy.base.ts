import { signal, inject, PLATFORM_ID, HostListener, Directive, OnInit, OnDestroy } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { TocItem } from './model-doc-toc/model-doc-toc.component';

/**
 * Base class for model documentation pages that need scroll-spy behavior.
 * Eliminates duplicated onScroll / activeSection / ngOnInit logic across
 * TextModelComponent, AudioModelV1Component, and AudioModelV2Component.
 */
@Directive()
export abstract class ModelDocScrollspyBase implements OnInit, OnDestroy {
  protected isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  activeSection = signal('overview');

  /** Each subclass defines its own table-of-contents entries. */
  abstract tocItems: TocItem[];

  ngOnInit(): void {
    if (this.isBrowser) {
      window.scrollTo(0, 0);
    }
  }

  ngOnDestroy(): void { }

  @HostListener('window:scroll')
  onScroll(): void {
    if (!this.isBrowser) return;

    let currentId = this.tocItems[0].id;

    const isMobile = window.innerWidth < 1024;
    const zoneTop = isMobile ? 120 : 70;
    const zoneBottom = isMobile ? 320 : 280;

    let activeSet = false;

    // 1. Check if any section's header is actively entering the reading zone
    for (let i = 0; i < this.tocItems.length; i++) {
      const el = document.getElementById(this.tocItems[i].id);
      if (!el) continue;

      const top = el.getBoundingClientRect().top;
      if (top >= zoneTop && top <= zoneBottom) {
        currentId = this.tocItems[i].id;
        activeSet = true;
        break;
      }
    }

    // 2. If no header is in the zone, user is deep inside a long section.
    if (!activeSet) {
      for (let i = this.tocItems.length - 1; i >= 0; i--) {
        const el = document.getElementById(this.tocItems[i].id);
        if (!el) continue;

        const top = el.getBoundingClientRect().top;
        if (top < zoneTop) {
          currentId = this.tocItems[i].id;
          break;
        }
      }
    }

    this.activeSection.set(currentId);
  }
}
