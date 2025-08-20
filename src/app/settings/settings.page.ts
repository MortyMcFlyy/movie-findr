import { Component, OnInit, inject } from '@angular/core';
import { AlertController } from '@ionic/angular';
import { PreferencesService, Settings } from '../services/preferences.service';

@Component({
  selector: 'app-settings',
  templateUrl: './settings.page.html',
  styleUrls: ['./settings.page.scss'],
  standalone: false,
})
export class SettingsPage implements OnInit {
  private prefs = inject(PreferencesService);

  settings: Settings = { darkMode: false, fskLevel: '0' };

  constructor(private alertController: AlertController) { }

  async ngOnInit() {
    this.settings = await this.prefs.getSettings();
    this.applyDarkMode(this.settings.darkMode);
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



  async openAbout() {
    const alert = await this.alertController.create({
      header: 'Über MovieFindr',
      message: 'MovieFindr v1.0.0<br>Erstellt als Hausarbeit für Webanwendungen<br>© 2025',
      buttons: ['OK']
    });

    await alert.present();
  }
}
