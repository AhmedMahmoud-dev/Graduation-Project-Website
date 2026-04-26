/**
 * Standard interfaces for the shared Emotion Chart components
 */

export interface TimelineDataPoint {
  label: string;               // Current X-Axis label (e.g. 'S1', '1.5s')
  probabilities: Record<string, number>; // emotion name -> value (0.0 to 1.0)
  tooltipTitle?: string;       // Optional title for tooltip (e.g. 'Sentence 1')
  tooltipDetail?: string;      // Optional detail for tooltip (e.g. The actual sentence text)
}

export interface DistributionDataPoint {
  label: string;               // Emotion name (e.g. 'Joy', 'Anger')
  value: number;               // Probability (0 to 1) or confidence (0 to 100)
  color?: string;              // Optional color override; otherwise uses theme service
}

export type TimelineViewMode = 'single' | 'compare';
export type DistributionViewMode = 'bar' | 'pie';
