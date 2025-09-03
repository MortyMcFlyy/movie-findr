import { Component, OnInit, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { MovieService } from '../services/movie.service';
import { Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Geolocation } from '@capacitor/geolocation';


interface MovieNews {
  id: number;
  title: string;
  content: string;
  date: string;
  link?: string;
}

@Component({
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, RouterModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA] 
})
export class HomePage implements OnInit {
  trendingMovies: any[] = [];
  recentlyViewed: any[] = [];
  movieNews: MovieNews[] = [];

  // Update for Swiper format
  slideOpts = {
    initialSlide: 0,
    speed: 400,
    autoplay: {
      delay: 5000,
      disableOnInteraction: false
    },
    loop: true
  };

  constructor(
    private movieService: MovieService,
    private router: Router
  ) { }

  ngOnInit() {
    this.loadTrendingMovies();
  }

  loadTrendingMovies() {
    this.movieService.getTrendingMovies().subscribe(
      (data: any) => {
        this.trendingMovies = data.results;
      },
      (error) => {
        console.error('Error loading trending movies:', error);
      }
    );
  }

  navigateToMovie(id: number) {
    this.router.navigate(['/folder', 'Inbox'], {
      queryParams: { movie: id }
    });
  }

  navigateToMovieTitle(title: string) {
    this.router.navigate(['/folder/Inbox'], { queryParams: { q: title } });
  }

  async testLocation() {
    try {
      // Check/Request permission
      const status = await Geolocation.checkPermissions();
      if (status.location !== 'granted') {
        const req = await Geolocation.requestPermissions();
        if (req.location !== 'granted') {
          alert('Standort-Berechtigung verweigert.');
          return;
        }
      }

      // Geolocation holen 
      const pos = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 10000
      });

      alert(`Latitude: ${pos.coords.latitude}, Longitude: ${pos.coords.longitude}`);
    } catch (err: any) {
      console.error('Geolocation error', err);
      alert('Fehler beim Standort: ' + (err?.message ?? JSON.stringify(err)));
    }
  }

}
