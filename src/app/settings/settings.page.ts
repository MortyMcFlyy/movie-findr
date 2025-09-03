import { Component, OnInit, inject } from '@angular/core';
import { AlertController, Platform } from '@ionic/angular';
import { Observable } from 'rxjs';
import { NativeSettings, AndroidSettings, IOSSettings } from 'capacitor-native-settings';
import { Preferences } from '@capacitor/preferences';
import { PreferencesService, Settings } from '../services/preferences.service';
import { LocationService } from '../services/location.service';
import { LocationState } from '../services/location.service';


@Component({
  selector: 'app-settings',
  templateUrl: './settings.page.html',
  styleUrls: ['./settings.page.scss'],
  standalone: false,
})
export class SettingsPage implements OnInit {
  state$!: Observable<LocationState>;
  private prefs = inject(PreferencesService);
  private alertController = inject(AlertController);
  private platform = inject(Platform);
  private location = inject(LocationService);

  favoriteProviders = new Set<string>();

  favoriteProvidersList = [
    'Netflix', 'Amazon Prime Video', 'Disney+', 'Apple TV', 'WOW', 'Hulu', 'Max'
  ];

  settings: Settings = { darkMode: false, fskLevel: '0' };
  aboutOpen = false;

  isWeb = !this.platform.is('hybrid');

  async ngOnInit() {
    this.isWeb = this.platform.is('desktop') || this.platform.is('mobileweb');
    this.settings = await this.prefs.getSettings();
    this.applyDarkMode(this.settings.darkMode);
    this.state$ = this.location.state$; // für async pipe im Template
    await this.loadFavProviders();
  }

  async onToggleDarkMode(enabled: boolean) {
    this.settings.darkMode = enabled;
    this.applyDarkMode(enabled);
    await this.prefs.patchSettings({ darkMode: enabled });
  }

  async onChangeFsk(level: string) {
    this.settings.fskLevel = level;
    await this.prefs.patchSettings({ fskLevel: level });
  }

  private applyDarkMode(enabled: boolean) {
    document.body.classList.toggle('dark', enabled);
  }

  async clearData() {
    const alert = await this.alertController.create({
      header: 'Daten löschen',
      message: 'Möchtest du wirklich alle gespeicherten Daten (Favoriten, Verlauf, Einstellungen) zurücksetzen?',
      buttons: [
        { text: 'Abbrechen', role: 'cancel' },
        { text: 'Löschen', role: 'confirm' },
      ],
    });
    await alert.present();
    const { role } = await alert.onDidDismiss();
    if (role === 'confirm') {
      await this.prefs.clearAll();
      this.settings = await this.prefs.getSettings();  // Defaults
      this.applyDarkMode(this.settings.darkMode); // Reset dark mode
      const done = await this.alertController.create({
        header: 'Zurückgesetzt',
        message: 'Alles wurde gelöscht.',
        buttons: ['OK'],
      });
      await done.present();
    }
  }

  openAbout() {
    this.aboutOpen = true;
  }

  // Standort manuell aktualisieren 
  async onUpdateLocation() {
    await this.location.updateNow();
  }

  // System Einstellungen öffnen
  async openAppSettings() {
    try {
      await NativeSettings.open({
        optionAndroid: AndroidSettings.ApplicationDetails,
        optionIOS: IOSSettings.About
      });
    } catch (e) {
      console.warn('could not open native settings', e);
    }
  }

  async loadFavProviders() {
    const res = await Preferences.get({ key: 'fav.providers' });
    const arr = res.value ? JSON.parse(res.value) as string[] : [];
    this.favoriteProviders = new Set(arr.map(s => s.trim()));
  }

  async toggleFavProvider(name: string, checked: boolean) {
    if (checked) this.favoriteProviders.add(name);
    else this.favoriteProviders.delete(name);
    await Preferences.set({ key: 'fav.providers', value: JSON.stringify([...this.favoriteProviders]) });
  }

  formatTs(ts: number | null): string {
    if (!ts) return 'nie';
    try {
      return new Date(ts).toLocaleString();
    } catch { return 'nie'; }
  }

}