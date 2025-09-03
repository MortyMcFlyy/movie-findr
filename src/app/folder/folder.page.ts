import { Component, inject, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { MovieService } from '../services/movie.service';
import { PopoverController } from '@ionic/angular';
import { Preferences } from '@capacitor/preferences';
import { FilterPopoverComponent } from './filter-popover/filter-popover.component';
import { PreferencesService } from '../services/preferences.service';
import { Subscription } from 'rxjs';
import { LocationService, LocationState } from '../services/location.service';
import { Router } from '@angular/router';
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
  private locSub?: Subscription;
  providerCountry: string = 'US'; // Fallback
  requireInMyCountry = true;
  favoriteProviders = new Set<string>();
  filterMode: 'all' | 'favorites' | 'any' = 'all';
  visibleMovies: any[] = [];
  searchExecuted = false;


  private activatedRoute = inject(ActivatedRoute);
  constructor(
    private movieService: MovieService,
    private popoverController: PopoverController,
    private prefs: PreferencesService,
    private toast: ToastController,
    private location: LocationService,
    private router: Router,
  ) { }


  async ngOnInit() {
    this.folder = this.activatedRoute.snapshot.paramMap.get('id') as string;

    // Check for genre query parameters
    this.activatedRoute.queryParams.subscribe((params) => {
      // Reset when parameters change
      this.movies = [];
      this.visibleMovies = [...this.movies];
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
        this.search();
      }
    });

    // Load both statuses after movies are loaded
    this.loadWatchedMovies();
    this.loadFavoriteMovies();

    const s1 = await Preferences.get({ key: 'mf.requireInMyCountry' });
    if (s1.value !== null) this.requireInMyCountry = s1.value === 'true';

    const s2 = await Preferences.get({ key: 'mf.filterMode' });
    if (s2.value === 'favorites' || s2.value === 'any' || s2.value === 'all') {
      this.filterMode = s2.value as any;
    }


    // Default: gesehene ausblenden 
    if (this.filterState.hideWatched === undefined) {
      this.filterState.hideWatched = true;
    }
    // Country Code aus Cache ziehen
    this.location.getCachedCountryCode().then(cc => {
      if (cc) this.providerCountry = cc;
    });

    // Standortänderungen
    this.locSub = this.location.state$.subscribe((s) => {
      const newCC = s.countryCode ?? null;

      if (s.permission !== 'granted') {
        if (this.providerCountry !== 'US') {
          this.providerCountry = 'US';
          this.reloadProvidersForCurrentMovies();
        }
        return;
      }

      if (newCC && newCC !== this.providerCountry) {
        this.providerCountry = newCC;
        this.reloadProvidersForCurrentMovies();
      }
    });

    const res = await Preferences.get({ key: 'fav.providers' });
    const arr = res.value ? JSON.parse(res.value) as string[] : [];
    this.favoriteProviders = new Set(arr.map(s => s.trim()));

    (this.movies || []).forEach(m => this.applyProviderVisibilityForMovie(m));
    this.rebuildVisibleMovies();
  }

  ngOnDestroy() {
    this.locSub?.unsubscribe();
  }

  search() {
    if (this.searchTerm.trim() === '') return;
    this.searchExecuted = true;

    // Reset genre search when performing a text search
    this.movies = [];
    this.visibleMovies = [...this.movies];
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
    this.visibleMovies = [...this.movies];
    this.currentPage = 1;

    const hasActiveFilters = Object.keys(this.filterState).length > 0;

    // Wenn Filter gesetzt sind, nutze applyFilters()
    if (hasActiveFilters) {
      this.applyFilters(); // nutzt currentCategoryId intern
      return;
    }

    // Ohne Filter = Standard Verhalten
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
        filters: this.filterState,
        filterMode: this.filterMode
      },
      showBackdrop: true,
      backdropDismiss: true
    });

    popover.onDidDismiss().then((res) => {
      if (res.data && res.data.filterMode) {
        this.filterMode = res.data.filterMode;
      }
      this.applyFilters();
    });

    await popover.present();
  }

  applyFilters() {
    this.movies = [];
    this.visibleMovies = [...this.movies];
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
          // Keine spezielle Sortierung
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

    // Gesehene ausblenden
    if (this.filterState.hideWatched !== false) {
      visible = visible.filter(m => !this.watchedIdSet.has(m.id));
    }

    // Nur Favoriten
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
    } else if (key === 'provider') {
      this.filterMode = 'any';
      this.requireInMyCountry = false;
      (this.movies || []).forEach(m => this.applyProviderVisibilityForMovie(m));
      this.rebuildVisibleMovies();
      return;
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
    this.visibleMovies = [...this.movies];
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
    const cc = this.providerCountry || 'US';

    this.movies.forEach(movie => {
      if (movie.id && !movie._providersRequested) {
        movie._providersRequested = true; // schützt vor Doppelcalls

        this.movieService.getProviders(movie.id).subscribe(
          (response: any) => {
            const results = response?.results || {};
            const keys = Object.keys(results);
            const countryData = results[cc] || (keys.length ? results[keys[0]] : null);

            if (countryData?.flatrate?.length) {
              movie.providers = countryData.flatrate.slice(0, 5);
            } else if (countryData?.rent?.length) {
              movie.providers = countryData.rent.slice(0, 5);
            } else {
              movie.providers = []; // nichts verfügbar
            }

            this.applyProviderVisibilityForMovie(movie);
            this.rebuildVisibleMovies();
          },
          (error: any) => {
            console.error(`Error fetching providers for movie ${movie.id}:`, error);
            movie.providers = [];
            this.applyProviderVisibilityForMovie(movie);
            this.rebuildVisibleMovies();
          }
        );
      } else {
        // Falls schon vorhanden Sichtbarkeit neu prüfen
        this.applyProviderVisibilityForMovie(movie);
      }
    });

    this.rebuildVisibleMovies();
  }

  async loadWatchedMovies() {
    const historyIds = await this.prefs.getHistory();
    this.watchedIdSet = new Set(historyIds);
    this.reapplyLocalFiltersIfReady();

    // Flag pro Movie für UI
    this.movies.forEach(movie => {
      movie.watched = this.watchedIdSet.has(movie.id);
    });
  }

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

  private reloadProvidersForCurrentMovies() {
    this.movies.forEach(m => m.providers = undefined);
    this.loadProvidersForMovies();
  }

  private applyProviderVisibilityForMovie(movie: any) {
    // Nur im Land verfügbar
    if (this.requireInMyCountry) {
      if (!movie.providers || movie.providers.length === 0) {
        movie._hiddenByProvider = true;
        return;
      }
    }

    // Edge Case: Modus "favorites", aber keine Lieblingsprovider gesetzt
    if (this.filterMode === 'favorites' && this.favoriteProviders.size === 0) {
      // Fallback: verhalte dich wie "all"
      movie._hiddenByProvider = false;
      return;
    }

    // Lieblingsprovider
    if (this.filterMode === 'favorites') {
      const hasFav = (movie.providers || []).some((p: any) =>
        this.favoriteProviders.has(String(p.provider_name || '').trim())
      );
      movie._hiddenByProvider = !hasFav;
      return;
    }

    // kein Filter
    movie._hiddenByProvider = false;
  }

  private rebuildVisibleMovies() {
    this.visibleMovies = (this.movies || []).filter(m => !m._hiddenByProvider);
  }

  onToggleInMyCountry(val: boolean) {
    this.requireInMyCountry = val;
    // Sichtbarkeit für alle Filme neu anwenden
    (this.movies || []).forEach(m => this.applyProviderVisibilityForMovie(m));
    this.rebuildVisibleMovies();
  }

  goToSettings() {
    this.router.navigate(['/settings']);
  }
}



