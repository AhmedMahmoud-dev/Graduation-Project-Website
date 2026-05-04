import { Injectable, inject } from '@angular/core';
import { Title, Meta } from '@angular/platform-browser';

@Injectable({
  providedIn: 'root'
})
export class SeoService {
  private titleService = inject(Title);
  private metaService = inject(Meta);

  updateMeta(config: { title: string, description: string, url: string, image?: string }) {
    const imageUrl = config.image || 'https://graduation-project-website-eight.vercel.app/og-image.png';

    // Set standard tags
    this.titleService.setTitle(config.title);
    this.metaService.updateTag({ name: 'description', content: config.description });

    // Set Open Graph tags
    this.metaService.updateTag({ property: 'og:title', content: config.title });
    this.metaService.updateTag({ property: 'og:description', content: config.description });
    this.metaService.updateTag({ property: 'og:url', content: config.url });
    this.metaService.updateTag({ property: 'og:image', content: imageUrl });
    this.metaService.updateTag({ property: 'og:type', content: 'website' });

    // Set Twitter tags
    this.metaService.updateTag({ name: 'twitter:card', content: 'summary_large_image' });
    this.metaService.updateTag({ name: 'twitter:title', content: config.title });
    this.metaService.updateTag({ name: 'twitter:description', content: config.description });
  }
}
