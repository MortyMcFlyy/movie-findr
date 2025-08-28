import { Component, inject, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { MovieService } from '../services/movie.service';
import { PopoverController } from '@ionic/angular';
import { FilterPopoverComponent } from './filter-popover/filter-popover.component';
import { PreferencesService } from '../services/preferences.service';
import { ToastController } from '@ionic/angular';
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
  filterState: any = {
    hideWatched: true,      // gesehene standardmäßig ausblenden
  };
  currentGenreId: number | null = null;
  currentGenreName: string | null = null;
  currentCategoryId: string | null = null;
  currentPage: number = 1;
  totalPages: number = 0;
  favoriteIds: number[] = [];
  favoriteIdSet = new Set<number>();
  watchedIdSet = new Set<number>();


  private activatedRoute = inject(ActivatedRoute);
  constructor(
    private movieService: MovieService,
    private popoverController: PopoverController,
    private prefs: PreferencesService,
    private toast: ToastController
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

      // Set searchTerm if exists
      if (params['q']) {
        this.searchTerm = params['q'];
        this.search(); // Optional: direkt suchen
      }
    });

    // Load both statuses after movies are loaded
    this.loadWatchedMovies();
    this.loadFavoriteMovies();

    // Default: gesehene ausblenden 
    if (this.filterState.hideWatched === undefined) {
      this.filterState.hideWatched = true;
    }
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
      this.movies = this.applyLocalUserFilters(res.results);
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
          this.loadProvidersForMovies();
          this.loadWatchedMovies();
          this.loadFavoriteMovies();
        });
        break;

      case 'top-rated':
        this.movieService.getTopRatedMovies(this.currentPage).subscribe((res: any) => {
          this.movies = [...this.movies, ...res.results];
          this.totalPages = res.total_pages;
          this.loadProvidersForMovies();
          this.loadWatchedMovies();
          this.loadFavoriteMovies();
        });
        break;

      case 'trending':
        this.movieService.getTrendingMovies('week', this.currentPage).subscribe((res: any) => {
          this.movies = [...this.movies, ...res.results];
          this.totalPages = res.total_pages;
          this.loadProvidersForMovies();
          this.loadWatchedMovies();
          this.loadFavoriteMovies();
        });
        break;
      case 'all':
      default:
        this.fetchWithOrWithoutFilter({ page: this.currentPage });
        break;
    }
  }

  loadMoreData(event: any) {
    if (this.currentPage >= this.totalPages && this.totalPages > 0) {
      event.target.complete();
      event.target.disabled = true;
      return;
    }

    this.currentPage++;

    // Hilfsfunktion
    const finish = (res: any) => {
      // Ergebnisse anhängen
      const filteredBatch = this.applyLocalUserFilters(res?.results ?? []);
      this.movies = [...this.movies, ...filteredBatch];

      // Gesamtseiten aktualisieren
      if (typeof res?.total_pages === 'number') {
        this.totalPages = res.total_pages;
      }

      this.loadProvidersForMovies();
      this.loadWatchedMovies();
      this.loadFavoriteMovies();

      // Infinite Scroll  abschließen
      event.target.complete();
    };

    const onError = () => {
      event.target.complete();
    };


    // Filter-Suche 
    if (Object.keys(this.filterState ?? {}).length > 0) {
      const options: any = {
        page: this.currentPage,
        include_adult: false
      };

      // Runtime-Filter
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
      // Rating / Votes / Sprache / Jahrzehnt
      if (this.filterState.rating) {
        options['vote_average.gte'] = parseFloat(this.filterState.rating);
      }
      if (this.filterState.voteCount) {
        options['vote_count.gte'] = parseInt(this.filterState.voteCount, 10);
      }
      if (this.filterState.language) {
        options['with_original_language'] = this.filterState.language;
      }
      // Jahrzehnte -> zu einem Zeitraum mergen
      if (this.filterState.decade?.length) {
        const decades = Array.isArray(this.filterState.decade)
          ? this.filterState.decade
          : [this.filterState.decade];

        type DecadeRange = { gte: string | null; lte: string | null };

        const ranges: DecadeRange[] = decades.map((dec: string) => {
          if (dec === 'older') {
            return { gte: null, lte: '1979-12-31' };
          }
          const start = `${dec}-01-01`;
          const end = `${parseInt(dec, 10) + 9}-12-31`;
          return { gte: start, lte: end };
        });

        const gtes = ranges
          .map((range: DecadeRange) => range.gte)
          .filter((date): date is string => !!date)
          .sort(); // ISO-Date Strings sortierbar

        const ltes = ranges
          .map((range: DecadeRange) => range.lte)
          .filter((date): date is string => !!date)
          .sort();

        if (gtes.length) options['primary_release_date.gte'] = gtes[0];
        if (ltes.length) options['primary_release_date.lte'] = ltes[ltes.length - 1];
      }


      // Genre in Filter übernehmen 
      if (this.currentGenreId) {
        options.with_genres = this.currentGenreId;
      }

      this.movieService.discoverMovies(options).subscribe(finish, onError);
      return;
    }

    // Genre-Paging 
    if (this.currentGenreId) {
      this.movieService
        .discoverMovies({
          page: this.currentPage,
          with_genres: this.currentGenreId,
          include_adult: false
        })
        .subscribe(finish, onError);
      return;
    }


    // Kategorie-Paging 
    if (this.currentCategoryId) {
      switch (this.currentCategoryId) {
        case 'popular':
          this.movieService.getPopularMovies(this.currentPage).subscribe(finish, onError);
          break;
        case 'top-rated':
          this.movieService.getTopRatedMovies(this.currentPage).subscribe(finish, onError);
          break;
        case 'trending':
          this.movieService.getTrendingMovies('week', this.currentPage).subscribe(finish, onError);
          break;
        default:
          this.movieService.discoverMovies({ page: this.currentPage, include_adult: false }).subscribe(finish, onError);
      }
      return;
    }

    // Suchbegriff-Paging
    if (this.searchTerm) {
      this.movieService.searchMovies(this.searchTerm, this.currentPage).subscribe(finish, onError);
      return;
    }

    // Fallback
    event.target.complete();
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

    // Jahrzehnte -> zu einem Zeitraum mergen
    if (this.filterState.decade?.length) {
      const decades = Array.isArray(this.filterState.decade)
        ? this.filterState.decade
        : [this.filterState.decade];

      type DecadeRange = { gte: string | null; lte: string | null };

      const ranges: DecadeRange[] = decades.map((dec: string) => {
        if (dec === 'older') {
          return { gte: null, lte: '1979-12-31' };
        }
        const start = `${dec}-01-01`;
        const end = `${parseInt(dec, 10) + 9}-12-31`;
        return { gte: start, lte: end };
      });

      const gtes = ranges
        .map((range: DecadeRange) => range.gte)
        .filter((date): date is string => !!date)
        .sort(); 

      const ltes = ranges
        .map((range: DecadeRange) => range.lte)
        .filter((date): date is string => !!date)
        .sort();

      if (gtes.length) options['primary_release_date.gte'] = gtes[0];
      if (ltes.length) options['primary_release_date.lte'] = ltes[ltes.length - 1];
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
      this.movies = this.applyLocalUserFilters(res.results);
      this.totalPages = res.total_pages;
      this.loadProvidersForMovies();
      this.loadWatchedMovies();
      this.loadFavoriteMovies();
    });
  }

  private applyLocalUserFilters(results: any[]): any[] {
    let visible = results ?? [];

    // 1) Gesehene ausblenden
    if (this.filterState.hideWatched !== false) {
      visible = visible.filter(m => !this.watchedIdSet.has(m.id));
    }

    // 2) Nur Favoriten
    if (this.filterState.favoritesOnly) {
      visible = visible.filter(m => this.favoriteIdSet.has(m.id));
    }

    return visible;
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
        this.loadProvidersForMovies();
        this.loadWatchedMovies();
        this.loadFavoriteMovies();
      });
    }
  }

  clearSingleFilter(key: string) {
    if (key === 'hideWatched') {
      this.filterState.hideWatched = false; // statt löschen -> explizit AUS
    } else if (key === 'favoritesOnly') {
      this.filterState.favoritesOnly = false;
    } else {
      delete this.filterState[key];
    }
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
    const fs = this.filterState || {};
    return Object.keys(fs).some((key) => {
      if (key === 'hideWatched') {
        // Abweichung vom Default
        return fs.hideWatched === false;
      }
      return !!fs[key]; 
    });
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

  // method to load watched status
  async loadWatchedMovies() {
    const historyIds = await this.prefs.getHistory();
    this.watchedIdSet = new Set(historyIds);
    this.reapplyLocalFiltersIfReady();


    // Flag pro Movie für UI
    this.movies.forEach(movie => {
      movie.watched = this.watchedIdSet.has(movie.id);
    });
  }

  // method to load favorite status
  async loadFavoriteMovies() {
    this.favoriteIds = await this.prefs.getFavorites();
    this.favoriteIdSet = new Set(this.favoriteIds);
    this.reapplyLocalFiltersIfReady();


    // Flag pro Movie
    this.movies.forEach(movie => {
      movie.favorite = this.favoriteIdSet.has(movie.id);
    });
  }

  // Toggle watchlist
  async onMarkWatched(movie: any, event: Event) {
    event.stopPropagation();

    const alreadyWatched = this.watchedIdSet.has(movie.id);

    if (alreadyWatched) {
      await this.prefs.removeFromHistory(movie.id);
      this.watchedIdSet.delete(movie.id);
      movie.watched = false;
    } else {
      await this.prefs.addToHistory(movie.id);
      this.watchedIdSet.add(movie.id);
      movie.watched = true;
    }
  }

  // Klick auf „Stern“ → Favorit toggeln + UI nachziehen
  async onToggleFavorite(movie: any, event: Event) {
    event.stopPropagation();
    await this.prefs.toggleFavorite(movie.id);
    await this.loadFavoriteMovies();           // IDs neu lesen und Flags setzen
  }

  private reapplyLocalFiltersIfReady(): void {
    if (this.movies?.length) {
      this.movies = this.applyLocalUserFilters(this.movies);
    }
  }


}
