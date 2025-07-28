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
  
  // Genre labels with their corresponding TMDB genre IDs
  public genres = [
    { name: 'Action', id: 28 },
    { name: 'Komödie', id: 35 },
    { name: 'Drama', id: 18 },
    { name: 'Science Fiction', id: 878 },
    { name: 'Horror', id: 27 },
    { name: 'Animation', id: 16 }
  ];

  constructor(private router: Router) {}
  
  // Navigate to genre search
  searchByGenre(genreId: number, genreName: string) {
    this.router.navigate(['/search'], { 
      queryParams: { 
        genre: genreId,
        name: genreName
      }
    });
  }
}
