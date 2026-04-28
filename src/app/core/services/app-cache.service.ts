import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class AppCacheService {

  /**
   * Reads a value from localStorage, parses JSON, and returns
   * the typed result or null on any error.
   */
  getItem<T>(key: string): T | null {
    try {
      const raw = localStorage.getItem(key);
      if (raw === null) return null;
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  /**
   * Serializes the data to JSON and saves it to localStorage.
   * Swallows all errors silently.
   */
  setItem<T>(key: string, data: T): void {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch { }
  }

  /**
   * Removes a single key from localStorage.
   */
  removeItem(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch { }
  }

  /**
   * Removes all localStorage keys that start with the given prefix,
   * except those listed in retainKeys.
   * This replaces manual loops over localStorage.length.
   */
  clear(prefix: string, retainKeys: string[] = []): void {
    try {
      const retainSet = new Set(retainKeys);
      const keysToRemove: string[] = [];

      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(prefix) && !retainSet.has(key)) {
          keysToRemove.push(key);
        }
      }

      keysToRemove.forEach(k => localStorage.removeItem(k));
    } catch { }
  }
}
