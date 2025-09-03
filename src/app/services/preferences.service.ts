import { Injectable } from '@angular/core';
import { Preferences } from '@capacitor/preferences';

export type Settings = { darkMode: boolean; fskLevel: string };

const KEYS = {
  SETTINGS: 'settings',
  FAVORITES: 'favorites',
  HISTORY: 'history',
} as const;

@Injectable({ providedIn: 'root' })
export class PreferencesService {

  // Einstellungen
  async getSettings(): Promise<Settings> {
    const { value } = await Preferences.get({ key: KEYS.SETTINGS });
    if (!value) return { darkMode: false, fskLevel: '0' };
    try { return JSON.parse(value) as Settings; } catch {
      return { darkMode: false, fskLevel: '0' };
    }
  }

  async setSettings(next: Settings): Promise<void> {
    await Preferences.set({ key: KEYS.SETTINGS, value: JSON.stringify(next) });
  }

  // geänderte Felder ersetzen
  async patchSettings(patch: Partial<Settings>): Promise<void> {
    const curr = await this.getSettings();
    await this.setSettings({ ...curr, ...patch });
  }

  // Favoriten
  async getFavorites(): Promise<number[]> {
    const { value } = await Preferences.get({ key: KEYS.FAVORITES });
    if (!value) return [];
    try { return JSON.parse(value) as number[]; } catch { return []; }
  }

  async setFavorites(ids: number[]): Promise<void> {
    await Preferences.set({ key: KEYS.FAVORITES, value: JSON.stringify(ids) });
  }

  async toggleFavorite(id: number): Promise<void> {
    const favs = await this.getFavorites();
    let next: number[];

    if (favs.includes(id)) {
      next = favs.filter(x => x !== id);
    } else {
      next = [id, ...favs];
    }

    await this.setFavorites(next);
  }

  // Verlauf
  private readonly HISTORY_MAX = 200;
  async getHistory(): Promise<number[]> {
    const { value } = await Preferences.get({ key: KEYS.HISTORY });
    if (!value) return [];
    try { return JSON.parse(value) as number[]; } catch { return []; }
  }

  async addToHistory(id: number): Promise<void> {
    const list = await this.getHistory();
    const deduped = [id, ...list.filter(x => x !== id)].slice(0, this.HISTORY_MAX);
    await Preferences.set({ key: KEYS.HISTORY, value: JSON.stringify(deduped) });
  }

  // Verlauf: Eintrag entfernen
  async removeFromHistory(id: number): Promise<void> {
    const historyIds = await this.getHistory();
    const updated = historyIds.filter(x => x !== id);
    await Preferences.set({ key: KEYS.HISTORY, value: JSON.stringify(updated) });
  }


  // Daten löschen
  async clearAll(): Promise<void> {
    await Preferences.remove({ key: KEYS.SETTINGS });
    await Preferences.remove({ key: KEYS.FAVORITES });
    await Preferences.remove({ key: KEYS.HISTORY });
  }

  // Verlauf löschen
  async clearHistory(): Promise<void> {
    await Preferences.set({ key: KEYS.HISTORY, value: JSON.stringify([]) });
  }

  //Favoriten löschen
  async clearFavorites(): Promise<void> {
    await Preferences.set({ key: KEYS.FAVORITES, value: JSON.stringify([]) });
  }

}
