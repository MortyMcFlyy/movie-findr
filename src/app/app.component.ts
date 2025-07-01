import { Component } from '@angular/core';
@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: false,
})
export class AppComponent {
  public appPages = [
    { title: 'Filme suchen', url: '/search', icon: 'search' },
    { title: 'Favoriten', url: '/favorites', icon: 'heart' },
    { title: 'Entdecke', url: '/discover', icon: 'film' },
    { title: 'Verlauf', url: '/history', icon: 'time' }
  ];
  public labels = ['Action', 'Komödie', 'Drama', 'Science Fiction', 'Horror', 'Animation'];
  constructor() {}
}
