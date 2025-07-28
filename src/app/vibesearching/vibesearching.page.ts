import { Component, OnInit } from '@angular/core';
import { MovieService } from '../services/movie.service';
import { AnimationController } from '@ionic/angular';

@Component({
  selector: 'app-vibesearching',
  templateUrl: './vibesearching.page.html',
  styleUrls: ['./vibesearching.page.scss'],
  standalone: false,
})
export class VibesearchingPage implements OnInit {
  currentStep = 1;
  selectedMood: string | null = null;
  selectedComplexity: string | null = null;
  selectedTimeframe: string | null = null;
  results: any[] = [];
  isAnimating = false;
  
  // Mapping von Stimmungen zu Genre-IDs für die TMDB-API
  moodToGenreMap = {
    happy: [35, 10751], // Comedy, Family
    relaxed: [18, 10749], // Drama, Romance
    thrilling: [28, 53], // Action, Thriller
    horror: [27], // Horror
    documentary: [99] // Dokumentation
  };

  constructor(
    private movieService: MovieService,
    private animationCtrl: AnimationController
  ) {}

  ngOnInit() {}

  selectMood(mood: string) {
    if (this.isAnimating) return;
    
    this.selectedMood = mood;
    this.isAnimating = true;
    
    // Animation starten und nach Abschluss zum nächsten Schritt wechseln
    setTimeout(() => {
      this.currentStep = 2;
      this.isAnimating = false;
    }, 800);
  }
  
  selectComplexity(complexity: string) {
    if (this.isAnimating) return;
    
    this.selectedComplexity = complexity;
    this.isAnimating = true;
    
    // Animation starten und nach Abschluss zum nächsten Schritt wechseln
    setTimeout(() => {
      this.currentStep = 3;
      this.isAnimating = false;
    }, 800);
  }

  selectTimeframe(timeframe: string) {
    if (this.isAnimating) return;
    
    this.selectedTimeframe = timeframe;
    this.isAnimating = true;
    
    // Einfache Animation und dann Ergebnisse laden
    setTimeout(() => {
      this.findMoviesByVibes();
      this.currentStep = 4;
      this.isAnimating = false;
    }, 800);
  }

  findMoviesByVibes() {
    // Filme basierend auf Stimmung, Komplexität und Zeitrahmen laden
    if (this.selectedMood === 'happy') {
      this.movieService.getPopularMovies().subscribe((res) => {
        // Filter für "leichte Kost" vs "anspruchsvoll"
        let results = res.results;
        if (this.selectedComplexity === 'easy') {
          results = results.filter((movie: any) => movie.vote_average < 7.5);
        } else {
          results = results.filter((movie: any) => movie.vote_average >= 7.5);
        }
        this.results = results.slice(0, 6);
      });
    } else if (this.selectedMood === 'relaxed') {
      this.movieService.getTopRatedMovies().subscribe((res) => {
        let results = res.results;
        if (this.selectedComplexity === 'easy') {
          results = results.filter((movie: any) => movie.vote_average < 8);
        } else {
          results = results.filter((movie: any) => movie.vote_average >= 8);
        }
        this.results = results.slice(0, 6);
      });
    } else if (this.selectedMood === 'thrilling') {
      this.movieService.getTrendingMovies().subscribe((res) => {
        let results = res.results;
        if (this.selectedComplexity === 'easy') {
          results = results.filter((movie: any) => movie.vote_average < 7);
        } else {
          results = results.filter((movie: any) => movie.vote_average >= 7);
        }
        this.results = results.slice(0, 6);
      });
    } else if (this.selectedMood === 'horror') {
      // Für Horror könnten wir nach Trend oder Beliebtheit sortieren
      this.movieService.getPopularMovies().subscribe((res) => {
        // Filtern nach Horrorgenre (27)
        let results = res.results.filter((movie: any) => 
          movie.genre_ids && movie.genre_ids.includes(27)
        );
        
        if (this.selectedComplexity === 'easy') {
          results = results.filter((movie: any) => movie.vote_average < 6.5);
        } else {
          results = results.filter((movie: any) => movie.vote_average >= 6.5);
        }
        this.results = results.slice(0, 6);
      });
    } else if (this.selectedMood === 'documentary') {
      this.movieService.getTopRatedMovies().subscribe((res) => {
        // Filtern nach Dokumentationsgenre (99)
        let results = res.results.filter((movie: any) => 
          movie.genre_ids && movie.genre_ids.includes(99)
        );
        
        if (this.selectedComplexity === 'easy') {
          results = results.filter((movie: any) => movie.vote_average < 8);
        } else {
          results = results.filter((movie: any) => movie.vote_average >= 8);
        }
        this.results = results.slice(0, 6);
      });
    }
  }

  restart() {
    this.currentStep = 1;
    this.selectedMood = null;
    this.selectedComplexity = null;
    this.selectedTimeframe = null;
    this.results = [];
  }
}
