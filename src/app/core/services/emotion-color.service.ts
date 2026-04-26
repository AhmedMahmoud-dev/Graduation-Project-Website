import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class EmotionColorService {

  /**
   * Returns a CSS variable reference for the given emotion label.
   * Used across all analysis pages and shared components.
   */
  getColor(label: string): string {
    const l = label?.toLowerCase() || 'neutral';
    if (l === 'positive') return 'var(--color-success)';
    if (l === 'negative') return 'var(--color-danger)';
    if (l === 'brain') return 'var(--color-brain)';
    return `var(--emotion-${l})`;
  }

  /**
   * Returns a color-mix background with transparency for badges/chips.
   */
  getBadgeBg(label: string, transparency = 92): string {
    return `color-mix(in srgb, ${this.getColor(label)}, transparent ${transparency}%)`;
  }

  /**
   * Returns a color-mix border with transparency.
   */
  getBadgeBorder(label: string, transparency = 80): string {
    return `1px solid color-mix(in srgb, ${this.getColor(label)}, transparent ${transparency}%)`;
  }

  /**
   * Returns a hero card gradient background.
   */
  getHeroGradient(label: string): string {
    const color = this.getColor(label);
    return `linear-gradient(135deg, var(--bg-card), color-mix(in srgb, ${color}, transparent 92%))`;
  }

  /**
   * Sorts a probabilities record into a descending array.
   */
  getSortedProbabilities(probs: Record<string, number>): { label: string; value: number }[] {
    return Object.entries(probs)
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value);
  }

  /**
   * JSON syntax highlighting for raw JSON display.
   */
  highlightJson(data: any): string {
    if (!data) return '';
    const json = JSON.stringify(data, null, 2);
    return json.replace(
      /(\"(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*\"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g,
      (match) => {
        let cls = 'json-number';
        if (/^"/.test(match)) {
          cls = /:$/.test(match) ? 'json-key' : 'json-string';
        } else if (/true|false/.test(match)) {
          cls = 'json-bool';
        } else if (/null/.test(match)) {
          cls = 'json-null';
        }
        return `<span class="${cls}">${match}</span>`;
      }
    );
  }
}
