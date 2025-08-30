import { Component, OnInit, inject } from '@angular/core';
import { AlertController } from '@ionic/angular';
import { Observable } from 'rxjs';
import { NativeSettings, AndroidSettings, IOSSettings } from 'capacitor-native-settings';
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

  settings: Settings = { darkMode: false, fskLevel: '0' };
  aboutOpen = false;

  constructor(
    private location: LocationService,
    private alertController: AlertController
  ) { }

  async ngOnInit() {
    this.settings = await this.prefs.getSettings();
    this.applyDarkMode(this.settings.darkMode);
    this.state$ = this.location.state$; // für async pipe im Template
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
    this.aboutOpen = true;   // ← Modal öffnen
  }

  // Standort manuell aktualisieren 
  onUpdateLocation() {
    this.location.updateNow();
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


}