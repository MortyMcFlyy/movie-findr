import { Component, OnInit } from '@angular/core';
import { AlertController } from '@ionic/angular';

@Component({
  selector: 'app-settings',
  templateUrl: './settings.page.html',
  styleUrls: ['./settings.page.scss'],
  standalone: false,
})
export class SettingsPage implements OnInit {
  darkMode = false;
  fskLevel = '0';

  constructor(private alertController: AlertController) {}

  ngOnInit() {
    // Load saved settings
    this.loadSettings();
  }

  loadSettings() {
    // Load dark mode setting
    const savedDarkMode = localStorage.getItem('darkMode');
    this.darkMode = savedDarkMode === 'true';
    
    // Apply dark mode if needed
    document.body.classList.toggle('dark', this.darkMode);
    
    // Load FSK setting
    const savedFsk = localStorage.getItem('fskLevel');
    if (savedFsk) {
      this.fskLevel = savedFsk;
    }
  }

  toggleDarkMode() {
    // Toggle dark mode class on body
    document.body.classList.toggle('dark', this.darkMode);
    
    // Save preference
    localStorage.setItem('darkMode', this.darkMode.toString());
  }

  async clearData() {
    const alert = await this.alertController.create({
      header: 'Daten löschen',
      message: 'Möchtest du wirklich alle gespeicherten Daten (Favoriten, History, Einstellungen) zurücksetzen?',
      buttons: [
        {
          text: 'Abbrechen',
          role: 'cancel'
        }, {
          text: 'Löschen',
          handler: () => {
            // Clear all app data
            localStorage.clear();
            this.loadSettings(); // Reset UI to defaults
          }
        }
      ]
    });

    await alert.present();
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
