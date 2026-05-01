import { Signal, WritableSignal, computed, signal } from '@angular/core';

export type SortDirection = 'asc' | 'desc' | null;

export interface SortState<T> {
  sortColumn: WritableSignal<keyof T | null>;
  sortDirection: WritableSignal<SortDirection>;
  sortedData: Signal<T[]>;
  toggleSort: (column: keyof T) => void;
}

export function useTableSort<T>(dataSignal: Signal<T[]>): SortState<T> {
  const sortColumn = signal<keyof T | null>(null);
  const sortDirection = signal<SortDirection>(null);

  const toggleSort = (col: keyof T) => {
    if (sortColumn() === col) {
      if (sortDirection() === 'asc') sortDirection.set('desc');
      else if (sortDirection() === 'desc') {
        sortColumn.set(null);
        sortDirection.set(null);
      }
    } else {
      sortColumn.set(col);
      sortDirection.set('asc');
    }
  };

  const sortedData = computed(() => {
    const data = [...dataSignal()];
    const col = sortColumn();
    const dir = sortDirection();

    if (!col || !dir) return data;

    return data.sort((a, b) => {
      const valA = a[col];
      const valB = b[col];

      if (valA === valB) return 0;
      
      const isAsc = dir === 'asc';
      if (valA == null) return isAsc ? 1 : -1;
      if (valB == null) return isAsc ? -1 : 1;

      if (typeof valA === 'string' && typeof valB === 'string') {
        // Custom sort for Priority
        const priorityOrder: Record<string, number> = { 'High': 3, 'Medium': 2, 'Low': 1 };
        if (priorityOrder[valA] !== undefined && priorityOrder[valB] !== undefined) {
          const pA = priorityOrder[valA];
          const pB = priorityOrder[valB];
          if (pA !== pB) {
            return isAsc ? pA - pB : pB - pA;
          }
        }
        return isAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      return valA < valB ? (isAsc ? -1 : 1) : (isAsc ? 1 : -1);
    });
  });

  return { sortColumn, sortDirection, sortedData, toggleSort };
}
