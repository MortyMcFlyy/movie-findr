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
  schemas: [CUSTOM_ELEMENTS_SCHEMA] // Add this schema
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
  ) {}

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
    // In echter App würdest du zur Detailseite navigieren
    // Hier simulieren wir es mit einem Umweg über den Folder
    this.router.navigate(['/folder', 'Inbox'], { 
      queryParams: { movie: id }
    });
  }

  navigateToMovieTitle(title: string) {
    this.router.navigate(['/folder/Inbox'], { queryParams: { q: title } });
  }

  async testLocation() {
    const pos = await Geolocation.getCurrentPosition();
    alert(`Latitude: ${pos.coords.latitude}, Longitude: ${pos.coords.longitude}`);
  }
}
