import { Injectable, signal, computed } from '@angular/core';
import { AnalysisSession, AudioAnalysisSession } from '../models/text-analysis.model';

/**
 * AnalysisStorageService — localStorage-backed session persistence with Signal-based reactivity.
 */
@Injectable({ providedIn: 'root' })
export class AnalysisStorageService {
  private readonly TEXT_STORAGE_KEY = 'emotra_text_sessions';
  private readonly AUDIO_STORAGE_KEY = 'emotra_audio_sessions';

  // State signals
  private textSessionsSignal = signal<AnalysisSession[]>([]);
  private audioSessionsSignal = signal<AudioAnalysisSession[]>([]);

  // Public readonly signals
  textSessions = this.textSessionsSignal.asReadonly();
  audioSessions = this.audioSessionsSignal.asReadonly();

  allSessions = computed(() => [...this.textSessionsSignal(), ...this.audioSessionsSignal()]);

  constructor() {
    this.migrateLegacyData();
    this.loadFromStorage();
  }

  private loadFromStorage(): void {
    try {
      const rawText = localStorage.getItem(this.TEXT_STORAGE_KEY);
      this.textSessionsSignal.set(rawText ? JSON.parse(rawText) : []);

      const rawAudio = localStorage.getItem(this.AUDIO_STORAGE_KEY);
      this.audioSessionsSignal.set(rawAudio ? JSON.parse(rawAudio) : []);
    } catch (e) {
      console.error('Failed to load sessions from storage:', e);
    }
  }

  /**
   * Automatically migrates data from legacy keys to the new emotra_ prefixed keys.
   */
  private migrateLegacyData(): void {
    const LEGACY_TEXT_KEY = 'emotion_history';
    const LEGACY_AUDIO_KEY = 'audio_emotion_history';
    const LEGACY_ANALYSIS_KEY = 'emotra_analysis_sessions';

    try {
      // 1. Migrate Text Sessions
      const oldTextKeys = [LEGACY_TEXT_KEY, LEGACY_ANALYSIS_KEY];
      let currentTextData = this.getSessions();
      let hasTextChange = false;

      oldTextKeys.forEach(k => {
        const raw = localStorage.getItem(k);
        if (raw) {
          try {
            const oldData = JSON.parse(raw);
            if (Array.isArray(oldData)) {
              oldData.forEach((ld: any) => {
                if (!currentTextData.some(c => c.id === ld.id)) {
                  currentTextData.push({ ...ld, type: ld.type || 'text' });
                  hasTextChange = true;
                }
              });
            }
          } catch (e) { }
          localStorage.removeItem(k);
        }
      });

      if (hasTextChange) {
        localStorage.setItem(this.TEXT_STORAGE_KEY, JSON.stringify(currentTextData));
      }

      // 2. Migrate Audio Sessions
      const legacyAudio = localStorage.getItem(LEGACY_AUDIO_KEY);
      if (legacyAudio) {
        try {
          const legacyData = JSON.parse(legacyAudio);
          if (Array.isArray(legacyData)) {
            const currentAudioData = this.getAudioSessions();
            let hasAudioUpdate = false;
            legacyData.forEach((ld: any) => {
              if (!currentAudioData.some(c => c.id === ld.id)) {
                currentAudioData.push({ ...ld, type: 'audio' });
                hasAudioUpdate = true;
              }
            });
            if (hasAudioUpdate) {
              localStorage.setItem(this.AUDIO_STORAGE_KEY, JSON.stringify(currentAudioData));
            }
          }
        } catch (e) { }
        localStorage.removeItem(LEGACY_AUDIO_KEY);
      }
    } catch (e) { }
  }

  // --- TEXT SESSIONS ---

  saveSession(session: AnalysisSession): void {
    this.textSessionsSignal.update(sessions => {
      // Prevent duplicate entries by client_id
      if (sessions.some(s => s.id === session.id)) return sessions;
      const newSessions = [session, ...sessions];
      try {
        localStorage.setItem(this.TEXT_STORAGE_KEY, JSON.stringify(newSessions));
      } catch (e) { }
      return newSessions;
    });
  }

  getSessions(): AnalysisSession[] {
    return this.textSessionsSignal();
  }

  getSessionById(id: string): AnalysisSession | null {
    return this.textSessionsSignal().find(s => s.id === id) ?? null;
  }

  // --- AUDIO SESSIONS ---

  saveAudioSession(session: AudioAnalysisSession): void {
    this.audioSessionsSignal.update(sessions => {
      // Prevent duplicate entries by client_id
      if (sessions.some(s => s.id === session.id)) return sessions;
      const newSessions = [session, ...sessions];
      try {
        localStorage.setItem(this.AUDIO_STORAGE_KEY, JSON.stringify(newSessions));
      } catch (e) { }
      return newSessions;
    });
  }

  getAudioSessions(): AudioAnalysisSession[] {
    return this.audioSessionsSignal();
  }

  getAudioSessionById(id: string): AudioAnalysisSession | null {
    return this.audioSessionsSignal().find(s => s.id === id) ?? null;
  }

  // --- GENERAL ---

  deleteSession(id: string, type: 'text' | 'audio' = 'text'): void {
    if (type === 'text') {
      this.textSessionsSignal.update(sessions => {
        const filtered = sessions.filter(s => s.id !== id);
        localStorage.setItem(this.TEXT_STORAGE_KEY, JSON.stringify(filtered));
        return filtered;
      });
    } else {
      this.audioSessionsSignal.update(sessions => {
        const filtered = sessions.filter(s => s.id !== id);
        localStorage.setItem(this.AUDIO_STORAGE_KEY, JSON.stringify(filtered));
        return filtered;
      });
    }
  }

  markAsSynced(clientId: string, cloudId: number, type: 'text' | 'audio' = 'text'): void {
    if (type === 'text') {
      this.textSessionsSignal.update(sessions => {
        const updated = sessions.map(s => s.id === clientId ? { ...s, isSynced: true, cloudId } : s);
        localStorage.setItem(this.TEXT_STORAGE_KEY, JSON.stringify(updated));
        return updated;
      });
    } else {
      this.audioSessionsSignal.update(sessions => {
        const updated = sessions.map(s => s.id === clientId ? { ...s, isSynced: true, cloudId } : s);
        localStorage.setItem(this.AUDIO_STORAGE_KEY, JSON.stringify(updated));
        return updated;
      });
    }
  }

  clearAll(): void {
    localStorage.removeItem(this.TEXT_STORAGE_KEY);
    localStorage.removeItem(this.AUDIO_STORAGE_KEY);
    this.textSessionsSignal.set([]);
    this.audioSessionsSignal.set([]);
  }
}
