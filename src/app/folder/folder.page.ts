import { Component, inject, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { MovieService } from '../services/movie.service';
import { PopoverController } from '@ionic/angular';
import { FilterPopoverComponent } from './filter-popover/filter-popover.component';
import { IonInfiniteScroll } from '@ionic/angular/standalone';
//https://ionicframework.com/docs/api/infinite-scroll

@Component({
  selector: 'app-folder',
  templateUrl: './folder.page.html',
  styleUrls: ['./folder.page.scss'],
  standalone: false,
})
export class FolderPage implements OnInit {
  @ViewChild(IonInfiniteScroll) infiniteScroll!: IonInfiniteScroll;

  public folder!: string;
  searchTerm: string = '';
  movies: any[] = [];
  filterState: any = {};
  currentGenreId: number | null = null;
  currentGenreName: string | null = null;
  currentCategoryId: string | null = null;
  currentPage: number = 1;
  totalPages: number = 0;

  private activatedRoute = inject(ActivatedRoute);
  constructor(
    private movieService: MovieService,
    private popoverController: PopoverController
  ) { }

  ngOnInit() {
    this.folder = this.activatedRoute.snapshot.paramMap.get('id') as string;

    // Check for genre query parameters
    this.activatedRoute.queryParams.subscribe((params) => {
      // Reset when parameters change
      this.movies = [];
      this.currentPage = 1;

      if (params['genre']) {
        this.currentGenreId = +params['genre'];
        this.currentGenreName = params['name'] || 'Genre';
        this.searchByGenre(this.currentGenreId);
      }
      else if (params['category']) {
        this.currentCategoryId = params['category'];
        this.currentGenreName = params['name'] || 'Kategorie';
        this.currentGenreId = null;
        if (this.currentCategoryId !== null) {
          this.searchByCategory(this.currentCategoryId);
        }
      }
    });

    // Load both statuses after movies are loaded
    this.loadWatchedMovies();
    this.loadFavoriteMovies();
  }

  search() {
    if (this.searchTerm.trim() === '') return;

    // Reset genre search when performing a text search
    this.movies = [];
    this.currentPage = 1;
    this.currentGenreId = null;
    this.currentGenreName = null;
    this.currentCategoryId = null

    this.movieService.searchMovies(this.searchTerm).subscribe((res: any) => {
      this.movies = res.results;
      this.loadProvidersForMovies();
      this.loadWatchedMovies();
      this.loadFavoriteMovies();
    });
  }

  searchByGenre(genreId: number) {
    this.fetchWithOrWithoutFilter({
      page: this.currentPage,
      with_genres: genreId,
      include_adult: false
    });
  }

  searchByCategory(categoryId: string) {
    this.currentCategoryId = categoryId;
    this.currentGenreId = null;
    this.movies = [];
    this.currentPage = 1;

    const hasActiveFilters = Object.keys(this.filterState).length > 0;

    // Wenn Filter gesetzt sind, nutze applyFilters()
    if (hasActiveFilters) {
      this.applyFilters(); // nutzt currentCategoryId intern
      return;
    }

    // Ohne Filter – Standard-Verhalten
    switch (categoryId) {
      case 'popular':
        this.movieService.getPopularMovies(this.currentPage).subscribe((res: any) => {
          this.movies = [...this.movies, ...res.results];
          this.totalPages = res.total_pages;
        });
        break;
      case 'top-rated':
        this.movieService.getTopRatedMovies(this.currentPage).subscribe((res: any) => {
          this.movies = [...this.movies, ...res.results];
          this.totalPages = res.total_pages;
        });
        break;
      case 'trending':
        this.movieService.getTrendingMovies('week', this.currentPage).subscribe((res: any) => {
          this.movies = [...this.movies, ...res.results];
          this.totalPages = res.total_pages;
        });
        break;
      case 'all':
      default:
        this.fetchWithOrWithoutFilter({ page: this.currentPage });
        break;
    }
  }


  loadMoreData(event: any) {
    if (this.currentPage >= this.totalPages) {
      event.target.complete();
      event.target.disabled = true;
      return;
    }

    this.currentPage++;

    if (Object.keys(this.filterState).length > 0) {
      const options: any = {
        page: this.currentPage,
        include_adult: false
      };

      // Gleiche Filterlogik wie in applyFilters()
      if (this.filterState.runtime) {
        if (this.filterState.runtime === '<90') {
          options['with_runtime.lte'] = 89;
        } else if (this.filterState.runtime === '90-120') {
          options['with_runtime.gte'] = 90;
          options['with_runtime.lte'] = 120;
        } else if (this.filterState.runtime === '>120') {
          options['with_runtime.gte'] = 121;
        }
      }

      if (this.filterState.rating) {
        options['vote_average.gte'] = parseFloat(this.filterState.rating);
      }

      if (this.filterState.voteCount) {
        options['vote_count.gte'] = parseInt(this.filterState.voteCount, 10);
      }

      if (this.filterState.language) {
        options['with_original_language'] = this.filterState.language;
      }

      if (this.filterState.decade) {
        const year = this.filterState.decade;
        if (year === 'older') {
          options['primary_release_date.lte'] = '1979-12-31';
        } else {
          options['primary_release_date.gte'] = `${year}-01-01`;
          options['primary_release_date.lte'] = `${parseInt(year) + 9}-12-31`;
        }
      }

      // Genre-ID setzen, wenn vorhanden
      if (this.currentGenreId) {
        options.with_genres = this.currentGenreId;
      }

      this.movieService.discoverMovies(options).subscribe((res: any) => {
        this.movies = [...this.movies, ...res.results];
        this.totalPages = res.total_pages;
        event.target.complete();
      });

    } else if (this.currentGenreId) {
      this.searchByGenre(this.currentGenreId);
      event.target.complete();
    } else if (this.currentCategoryId) {
      this.searchByCategory(this.currentCategoryId);
      event.target.complete();
    } else if (this.searchTerm) {
      this.movieService.searchMovies(this.searchTerm, this.currentPage).subscribe((res: any) => {
        this.movies = [...this.movies, ...res.results];
        event.target.complete();
      });
    } else {
      event.target.complete();
    }

    this.loadProvidersForMovies();
    this.loadWatchedMovies();
    this.loadFavoriteMovies();
  }

  async openFilterPopover(ev: Event) {
    const popover = await this.popoverController.create({
      component: FilterPopoverComponent,
      event: ev,
      translucent: true,
      componentProps: {
        filters: this.filterState // Referenz, kein Clone!
      },
      showBackdrop: true,
      backdropDismiss: true
    });

    await popover.present();

    // applyFilters nur bei Dismiss (z. B. Reset oder manuelles Schließen)
    popover.onDidDismiss().then(() => {
      this.applyFilters();
    });

  }

  applyFilters() {
    this.movies = [];
    this.currentPage = 1;

    const options: any = {
      page: this.currentPage,
      include_adult: false
    };

    // Sprache 
    if (this.filterState.language?.length) {
      const langs = Array.isArray(this.filterState.language) ? this.filterState.language : [this.filterState.language];
      options['with_original_language'] = langs.join(',');
    }

    // Bewertung
    if (this.filterState.rating) {
      options['vote_average.gte'] = parseFloat(this.filterState.rating);
    }

    // Anzahl Bewertungen
    if (this.filterState.voteCount) {
      options['vote_count.gte'] = parseInt(this.filterState.voteCount, 10);
    }

    // // Mapping der Filter auf TMDb-API-Parameter
    // if (this.filterState.runtime) {
    //   if (this.filterState.runtime === '<90') {
    //     options['with_runtime.lte'] = 89;
    //   } else if (this.filterState.runtime === '90-120') {
    //     options['with_runtime.gte'] = 90;
    //     options['with_runtime.lte'] = 120;
    //   } else if (this.filterState.runtime === '>120') {
    //     options['with_runtime.gte'] = 121;
    //   }
    // }

    // Laufzeit 
    const runtimeFilters: any[] = [];
    if (this.filterState.runtime?.length) {
      const runtimes = Array.isArray(this.filterState.runtime) ? this.filterState.runtime : [this.filterState.runtime];
      runtimes.forEach((val: string) => {
        if (val === '<90') {
          runtimeFilters.push({ gte: 0, lte: 89 });
        } else if (val === '90-120') {
          runtimeFilters.push({ gte: 90, lte: 120 });
        } else if (val === '>120') {
          runtimeFilters.push({ gte: 121 });
        }
      });
    }

    // Jahrzehnte
    const decadeFilters: any[] = [];
    if (this.filterState.decade?.length) {
      const decades = Array.isArray(this.filterState.decade) ? this.filterState.decade : [this.filterState.decade];
      decades.forEach((dec: string) => {
        if (dec === 'older') {
          decadeFilters.push({ lte: '1979-12-31' });
        } else {
          const start = `${dec}-01-01`;
          const end = `${parseInt(dec, 10) + 9}-12-31`;
          decadeFilters.push({ gte: start, lte: end });
        }
      });
    }

    // Genre beibehalten, wenn gesetzt
    if (this.currentCategoryId) {
      switch (this.currentCategoryId) {
        case 'popular':
          options['sort_by'] = 'popularity.desc';
          break;
        case 'top-rated':
          options['sort_by'] = 'vote_average.desc';
          options['vote_count.gte'] = options['vote_count.gte'] || 200; // Mindestanzahl Stimmen
          break;
        case 'trending':
          options['sort_by'] = 'popularity.desc'; 
          break;
        case 'all':
          // Keine spezielle Sortierung TODO: zufällige sortierung?
          break;
        default:
          options.with_genres = parseInt(this.currentCategoryId); // fallback falls Kategorie ID = Genre ID
      }
    }
    // Genre-ID setzen, wenn vorhanden (hat Vorrang vor Category)
    if (this.currentGenreId) {
      options.with_genres = this.currentGenreId;
    }

    this.movieService.discoverMovies(options).subscribe((res: any) => {
      this.movies = res.results;
      this.totalPages = res.total_pages;
    });
  }

  private fetchWithOrWithoutFilter(options: any) {
    if (Object.keys(this.filterState).length > 0) {
      this.applyFilters();
    } else {
      this.movieService.discoverMovies({
        ...options,
        include_adult: false
      }).subscribe((res: any) => {
        this.movies = [...this.movies, ...res.results];
        this.totalPages = res.total_pages;
      });
    }
  }

  clearSingleFilter(key: string) {
    delete this.filterState[key];
    this.applyFilters();
  }

  clearGenreOrCategory() {
    this.currentGenreId = null;
    this.currentCategoryId = null;
    this.currentGenreName = null;
    this.movies = [];
    this.applyFilters();
  }

  displayRuntime(value: string): string {
    switch (value) {
      case '<90': return '< 90 min';
      case '90-120': return '90–120 min';
      case '>120': return '> 120 min';
      default: return value;
    }
  }

  displayLanguage(lang: string): string {
    switch (lang) {
      case 'de': return 'Deutsch';
      case 'en': return 'Englisch';
      default: return lang;
    }
  }

  displayDecade(decade: string): string {
    switch (decade) {
      case 'older': return 'Älter';
      default: return `${decade}er`;
    }
  }

  hasActiveFilters(): boolean {
    return this.filterState && Object.keys(this.filterState).length > 0;
  }

  clearAllFilters() {
    for (const key in this.filterState) {
      delete this.filterState[key];
    }
    this.applyFilters();
  }

  loadProvidersForMovies() {
    this.movies.forEach(movie => {
      if (movie.id && !movie.providers) {
        // Only fetch if we have an ID and haven't already loaded providers
        this.movieService.getProviders(movie.id).subscribe(
          response => {
            // The API returns providers by country, we'll use US or fallback to first available
            const results = response.results || {};
            const countryData = results['US'] || results[Object.keys(results)[0]];
            
            // Get flatrate (streaming) providers if available
            if (countryData && countryData.flatrate) {
              movie.providers = countryData.flatrate.slice(0, 5); // Limit to 5 providers
            } else if (countryData && countryData.rent) {
              movie.providers = countryData.rent.slice(0, 5); // Fallback to rent options
            } else {
              movie.providers = []; // No providers available
            }
          },
          error => {
            console.error(`Error fetching providers for movie ${movie.id}:`, error);
            movie.providers = []; // Set empty array on error
          }
        );
      }
    });
  }

  toggleWatched(movie: any, event: Event) {
    // Prevent event from propagating to card click handler if you have one
    event.stopPropagation();
    
    // Toggle watched status
    movie.watched = !movie.watched;
    
    // Save to local storage
    this.saveWatchedMovies();
  }

  // Add method to save watched movies
  saveWatchedMovies() {
    // Get current list of watched movie IDs
    const watchedMovies = this.movies
      .filter(movie => movie.watched)
      .map(movie => movie.id);
      
    // Save to localStorage
    localStorage.setItem('watchedMovies', JSON.stringify(watchedMovies));
  }

  // Add method to load watched status
  loadWatchedMovies() {
    const watchedIds = JSON.parse(localStorage.getItem('watchedMovies') || '[]');
    
    // Mark movies as watched if their ID is in the saved list
    this.movies.forEach(movie => {
      movie.watched = watchedIds.includes(movie.id);
    });
  }

  toggleFavorite(movie: any, event: Event) {
    // Prevent event from propagating to card click handler
    event.stopPropagation();
    
    // Toggle favorite status
    movie.favorite = !movie.favorite;
    
    // Save to local storage
    this.saveFavoriteMovies();
  }

  // Add method to save favorite movies
  saveFavoriteMovies() {
    // Get current list of favorite movie IDs
    const favoriteMovies = this.movies
      .filter(movie => movie.favorite)
      .map(movie => movie.id);
      
    // Save to localStorage
    localStorage.setItem('favoriteMovies', JSON.stringify(favoriteMovies));
  }

  // Add method to load favorite status
  loadFavoriteMovies() {
    const favoriteIds = JSON.parse(localStorage.getItem('favoriteMovies') || '[]');
    
    // Mark movies as favorite if their ID is in the saved list
    this.movies.forEach(movie => {
      movie.favorite = favoriteIds.includes(movie.id);
    });
  }
}
