import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class FormattingService {

  /**
   * Standardized date formatting for the application.
   * e.g., "Apr 28, 2026, 09:05 AM"
   */
  formatDate(dateStr: string | Date | undefined | null): string {
    if (!dateStr) return '';

    let date: Date;
    if (dateStr instanceof Date) {
      date = dateStr;
    } else {
      // Ensure UTC parsing by appending Z if no timezone info present
      const normalized = typeof dateStr === 'string' && !dateStr.endsWith('Z') && !dateStr.includes('+')
        ? dateStr + 'Z'
        : dateStr;
      date = new Date(normalized);
    }

    if (isNaN(date.getTime())) return '';

    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  /**
   * Maps an emotion label or severity to its corresponding CSS variable.
   */
  getEmotionColor(label: string | undefined | null): string {
    const l = label?.toLowerCase() || 'neutral';

    // Special semantic overrides
    if (l === 'positive' || l === 'success') return 'var(--color-success)';
    if (l === 'negative' || l === 'error' || l === 'critical') return 'var(--color-danger)';
    if (l === 'high') return 'var(--emotion-fear)'; // Standard mapping for high severity
    if (l === 'medium') return 'var(--emotion-joy)'; // Standard mapping for medium severity
    if (l === 'low' || l === 'natural') return 'var(--emotion-neutral)';

    return `var(--emotion-${l})`;
  }

  /**
   * Truncates text with an ellipsis if it exceeds the specified limit.
   */
  truncate(text: string | undefined | null, limit: number = 60, suffix: string = '...'): string {
    if (!text) return '';
    if (text.length <= limit) return text;
    return text.substring(0, limit).trim() + suffix;
  }

  /**
   * Formats a confidence score from decimal (0.85) or percentage (85) to a clean string.
   */
  formatConfidence(value: number | undefined | null): string {
    if (value === undefined || value === null) return '0.0';
    const val = value > 1 ? value : value * 100;
    return val.toFixed(1);
  }

  /**
   * Formats a date string to MM/DD.
   */
  formatShortDate(dateStr: string | undefined | null): string {
    if (!dateStr) return '';
    const parts = dateStr.split('T')[0].split('-');
    return parts.length === 3 ? `${parts[1]}/${parts[2]}` : dateStr;
  }

  /**
   * Gets initials from a full name.
   */
  getInitials(name: string | undefined | null): string {
    if (!name) return 'U';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return parts[0][0].toUpperCase();
  }

  /**
   * Generic chronological sort for any list with a date-like string property.
   * Returns a new sorted array — does not mutate the original.
   */
  sortByDate<T>(
    list: T[],
    order: 'newest' | 'oldest',
    dateKey: keyof T = 'timestamp' as keyof T
  ): T[] {
    return [...list].sort((a, b) => {
      const timeA = new Date((a[dateKey] as string) || '').getTime();
      const timeB = new Date((b[dateKey] as string) || '').getTime();
      return order === 'newest' ? timeB - timeA : timeA - timeB;
    });
  }
}
