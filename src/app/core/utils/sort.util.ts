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

      const isAsc = dir === 'asc';

      // 1. Custom Status Sort (Admin Users, Bugs, Support)
      // We must do this BEFORE valA === valB check, because 'is_active'
      // might be equal (both true), but their 'is_online' states might differ.
      if (col === 'status' || col === 'is_active') {
        const getStatusScore = (item: any) => {
          // User Status (derived from is_active + is_online + heartbeat)
          if (col === 'is_active') {
            if (!item.is_active) return 1; // Banned

            // Sync with UI logic: Online = is_online OR last seen < 60s
            let isOnline = !!item.is_online;
            if (!isOnline && item.last_seen_at) {
              const dateStr = String(item.last_seen_at).endsWith('Z') ? String(item.last_seen_at) : String(item.last_seen_at) + 'Z';
              const lastSeen = new Date(dateStr).getTime();
              if ((Date.now() - lastSeen) < 60 * 1000) {
                isOnline = true;
              }
            }

            if (isOnline) return 3;  // Online
            return 2;                // Offline
          }

          // Bug/Support Status
          const s = String(item[col] || '').toLowerCase();
          const orders: Record<string, number> = {
            'open': 3, 'pending': 3,
            'in progress': 2, 'replied': 1,
            'closed': 1, 'fixed': 1
          };
          return orders[s] || 0;
        };

        const scoreA = getStatusScore(a);
        const scoreB = getStatusScore(b);
        if (scoreA !== scoreB) {
          return isAsc ? scoreA - scoreB : scoreB - scoreA;
        }
        // If scores are equal, fall through to default behavior to maintain stable sort
      }

      if (valA === valB) return 0;
      
      if (valA == null) return isAsc ? 1 : -1;
      if (valB == null) return isAsc ? -1 : 1;

      // 2. Custom Sort for Priority
      if (col === 'priority') {
        const priorityOrder: Record<string, number> = { 'high': 3, 'medium': 2, 'low': 1 };
        const pA = priorityOrder[String(valA).toLowerCase()] || 0;
        const pB = priorityOrder[String(valB).toLowerCase()] || 0;
        if (pA !== pB) {
          return isAsc ? pA - pB : pB - pA;
        }
      }

      if (typeof valA === 'string' && typeof valB === 'string') {
        return isAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      return valA < valB ? (isAsc ? -1 : 1) : (isAsc ? 1 : -1);
    });
  });

  return { sortColumn, sortDirection, sortedData, toggleSort };
}
