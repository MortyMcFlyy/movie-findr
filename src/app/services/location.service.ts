import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Geolocation } from '@capacitor/geolocation';
import { Preferences } from '@capacitor/preferences';

export type LocPermission = 'granted' | 'denied' | 'prompt';
export interface Coords { lat: number; lng: number; accuracy?: number; timestamp: number; }
export interface LocationState {
  permission: LocPermission;
  coords: Coords | null;
  countryCode: string | null;
  lastUpdated: number | null;
}

const KEYS = {
  perm: 'loc.permission',
  coords: 'loc.coords',
  country: 'loc.country',
  updated: 'loc.updated',
};

@Injectable({ providedIn: 'root' })
export class LocationService {
  private _state$ = new BehaviorSubject<LocationState>({
    permission: 'prompt', coords: null, countryCode: null, lastUpdated: null
  });
  state$ = this._state$.asObservable();

  // Bei Start: Permission checken/anfragen und Standort holen
  async initOnAppStart() {
    await this.refreshPermissionAndMaybePrompt();
    await this.updateIfStale(12 * 60 * 60 * 1000); // 12h Cache
  }

  // Permission prüfen/fragen + speichern (egal ob granted oder denied)
  async refreshPermissionAndMaybePrompt(): Promise<LocPermission> {
    const c = await Geolocation.checkPermissions();
    let perm: LocPermission = (c.location as any) ?? 'prompt';

    if (perm !== 'granted') {
      const r = await Geolocation.requestPermissions();
      perm = (r.location as any) ?? 'prompt';
    }

    // Persistiere den Permission-Status
    await Preferences.set({ key: KEYS.perm, value: perm });

    // Bei nicht erteilter Berechtigung ALLES zurücksetzen,
    if (perm !== 'granted') {
      await this.resetPersistedLocation('denied');
      return perm;
    }

    // granted: Permission im State setzen (weitere Daten kommen aus fetchAndPersist / updateIfStale)
    this._state$.next({ ...this._state$.value, permission: perm });
    return perm;
  }


  // Manuelles Aktualisieren
  async updateNow() {
    const perm = await this.refreshPermissionAndMaybePrompt();
    if (perm !== 'granted') return; // gespeichert ist es trotzdem (denied)
    await this.fetchAndPersist();
  }

  // Cache-Logik
  private async updateIfStale(ttlMs: number) {
    const lastUpdated = Number((await Preferences.get({ key: KEYS.updated })).value ?? 0);
    if (!lastUpdated || (Date.now() - lastUpdated) > ttlMs) {
      if (this._state$.value.permission === 'granted') await this.fetchAndPersist();
    } else {
      const coordsRaw = (await Preferences.get({ key: KEYS.coords })).value;
      const country = (await Preferences.get({ key: KEYS.country })).value;
      const coords = coordsRaw ? JSON.parse(coordsRaw) as Coords : null;
      this._state$.next({ ...this._state$.value, coords, countryCode: country ?? null, lastUpdated });
    }
  }

  private async resetPersistedLocation(reason: 'denied' | 'error' = 'denied') {
    // Persistenz leeren
    await Preferences.remove({ key: KEYS.coords });
    await Preferences.remove({ key: KEYS.country });
    await Preferences.remove({ key: KEYS.updated });

    // State zurücksetzen 
    const perm = reason === 'denied' ? 'denied' : this._state$.value.permission;
    this._state$.next({
      permission: perm as LocPermission,
      coords: null,
      countryCode: null,
      lastUpdated: null
    });
  }


  private async fetchAndPersist() {
    const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 10000 });
    const coords: Coords = {
      lat: pos.coords.latitude,
      lng: pos.coords.longitude,
      accuracy: pos.coords.accuracy ?? undefined,
      timestamp: Date.now()
    };
    const countryCode = await this.coordsToCountry(coords.lat, coords.lng);
    await Preferences.set({ key: KEYS.coords, value: JSON.stringify(coords) });
    if (countryCode) await Preferences.set({ key: KEYS.country, value: countryCode });
    await Preferences.set({ key: KEYS.updated, value: String(Date.now()) });
    this._state$.next({ permission: 'granted', coords, countryCode: countryCode ?? null, lastUpdated: Date.now() });
  }

  async getCachedCountryCode(): Promise<string | null> {
    const v = await Preferences.get({ key: KEYS.country });
    return (v.value as string) ?? null;
  }

  // GPS --> Ländercode via Nominatim (sparsam verwenden & cachen!)
  private async coordsToCountry(lat: number, lng: number): Promise<string | null> {
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1&zoom=3`;
      // Hinweis: Öffentliche Nominatim-Policy: max ~1 req/s, eindeutiger UA/Referer, Attribution. Nutze Cache! :contentReference[oaicite:3]{index=3}
      const res = await fetch(url, { headers: { 'Accept-Language': 'de,en;q=0.9' } });
      const data = await res.json();
      return data?.address?.country_code ? String(data.address.country_code).toUpperCase() : null;
    } catch (e) {
      console.warn('reverse geocode failed', e);
      return null;
    }
  }
}
