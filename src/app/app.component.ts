import { Component } from '@angular/core';
import { Router } from '@angular/router';

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
    { title: 'VibeSearching', url: '/vibesearching', icon: 'film' },
    { title: 'Verlauf', url: '/history', icon: 'time' }
  ];

  // Kategorien 
  public categories = [
    // Spezielle Kategorien
    { name: 'Alle Filme', type: 'category', id: 'all' },
    { name: 'Beliebt', type: 'category', id: 'popular' },
    { name: 'Bestbewertete', type: 'category', id: 'top-rated' },
    { name: 'Aktuelle Trends', type: 'category', id: 'trending' },

    // Genres
    { name: 'Action', type: 'genre', id: 28 },
    { name: 'Komödie', type: 'genre', id: 35 },
    { name: 'Drama', type: 'genre', id: 18 },
    { name: 'Science Fiction', type: 'genre', id: 878 },
    { name: 'Horror', type: 'genre', id: 27 },
    { name: 'Animation', type: 'genre', id: 16 }
  ];


  constructor(private router: Router) { }

  // Navigation based on category type
  searchByCategory(category: any) {
    if (category.type === 'genre') {
      // Für Genres wie bisher
      this.router.navigate(['/search'], {
        queryParams: {
          genre: category.id,
          name: category.name
        }
      });
    } else {
      // Für spezielle Kategorien
      this.router.navigate(['/search'], {
        queryParams: {
          category: category.id,
          name: category.name
        }
      });
    }
  }
}
