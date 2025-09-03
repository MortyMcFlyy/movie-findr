import { Component, OnInit, inject } from '@angular/core';
import { MovieService } from '../services/movie.service';
import { PreferencesService } from '../services/preferences.service';

// Type für die Stimmungen
type Mood = 'happy' | 'relaxed' | 'thrilling' | 'horror' | 'love' | 'music' | 'documentary' | 'action';

@Component({
  selector: 'app-vibesearching',
  templateUrl: './vibesearching.page.html',
  styleUrls: ['./vibesearching.page.scss'],
  standalone: false,
})
export class VibesearchingPage implements OnInit {
  private movieService = inject(MovieService);
  private prefs = inject(PreferencesService);

  currentStep = 1;
  selectedMood: Mood | null = null;

  // Neuer filmspezifischer Typ
  selectedDuration: 'shortfilm' | 'short' | 'normal' | 'extended' | 'any' | null = null;
  selectedTimeframe: string | null = null;
  results: any[] = [];
  isAnimating = false;

  // Favoriten-Set
  favoriteIdSet: Set<number> = new Set<number>();
  watchedIdSet: Set<number> = new Set<number>();

  // Mapping von Stimmungen zu Genre-IDs für TMDB
  moodToGenreMap: Record<Mood, number[]> = {
    happy: [35, 10751, 16],
    relaxed: [18, 10749, 14],
    thrilling: [28, 53, 80, 9648],
    horror: [27, 9648],
    love: [10749],
    music: [10402],
    documentary: [99],
    action: [28]
  };

  async ngOnInit() {
    await this.loadFavoritesSet();
    await this.loadWatchedMovies();
  }

  selectMood(mood: Mood) {
    if (this.isAnimating) return;
    
    this.selectedMood = mood;
    this.isAnimating = true;
    
    // Animation starten
    setTimeout(() => {
      this.currentStep = 2;
      this.isAnimating = false;
    }, 800);
  }
  
  selectDuration(duration: 'shortfilm' | 'short' | 'normal' | 'extended' | 'any') {
    if (this.isAnimating) return;
    
    this.selectedDuration = duration;
    this.isAnimating = true;
    
    // Animation starten
    setTimeout(() => {
      this.currentStep = 3;
      this.isAnimating = false;
    }, 800);
  }

  selectTimeframe(timeframe: string) {
    if (this.isAnimating) return;
    
    this.selectedTimeframe = timeframe;
    this.isAnimating = true;
    
    // Einfache Animation
    setTimeout(() => {
      this.findMoviesByVibes();
      this.currentStep = 4;
      this.isAnimating = false;
    }, 800);
  }

  findMoviesByVibes() {
    const discoverParams: any = {
      page: Math.floor(Math.random() * 5) + 1
    };

    // Genres basierend auf Stimmung
    if (this.selectedMood && this.moodToGenreMap[this.selectedMood]) {
      discoverParams.with_genres = this.moodToGenreMap[this.selectedMood].join('|');
    }

    // Filmdauer mit angepassten Qualitätsfiltern
    if (this.selectedDuration === 'shortfilm') {
      discoverParams['with_runtime.lte'] = 40;
      // Reduzierte Filterkriterien für Kurzfilme
      discoverParams.vote_average_gte = 6.0;  // Niedrigere Mindestbewertung
      discoverParams.vote_count_gte = 20;     // Deutlich weniger Bewertungen erforderlich
    } else if (this.selectedDuration === 'short') {
      discoverParams['with_runtime.gte'] = 40;
      discoverParams['with_runtime.lte'] = 90;
      // Standardfilter für andere Filmlängen beibehalten
      discoverParams.vote_average_gte = 7.0;
      discoverParams.vote_count_gte = 200;
    } else {
      // Andere Filmlängen
      discoverParams.vote_average_gte = 7.0;
      discoverParams.vote_count_gte = 200;
    }

    // Einschränkung nur für Klassiker
    if (this.selectedTimeframe === 'classic') {
      discoverParams.primary_release_date_gte = '1970-01-01';
      discoverParams.primary_release_date_lte = '2005-12-31';
      discoverParams.vote_average_gte = 7.0;
      discoverParams.vote_count_gte = 500;
      discoverParams.sort_by = 'vote_average.desc';
    } else if (this.selectedTimeframe === 'new') {
      const currentYear = new Date().getFullYear();
      const twoYearsAgo = currentYear - 2;
      discoverParams.primary_release_date_gte = `${twoYearsAgo}-01-01`;
    }

    // Bewertungsbeschränkungen optimieren für relevantere Ergebnisse
    discoverParams.vote_average_gte = 7.0;  // Mindestens 7.0/10
    discoverParams.vote_average_lte = 9.0;  // Maximal 9.0/10
    discoverParams.vote_count_gte = 200;    // Mehr Bewertungen für bessere Aussagekraft
  
    // Sortierung: höher bewertete Filme bevorzugen, aber nicht ausschließlich
    // Sortierung anpassen für ein besseres Gleichgewicht
    if (this.selectedMood === 'thrilling' || this.selectedMood === 'action') {
      // Bei spannenden Filmen oder Action eher nach Beliebtheit sortieren
      discoverParams.sort_by = 'popularity.desc';
    } else if (this.selectedMood === 'documentary' || this.selectedMood === 'relaxed') {
      // Bei Dokus und entspannten Filmen nach Bewertung sortieren
      discoverParams.sort_by = 'vote_average.desc';
    } else {
      // Standard: Kombination aus Bewertung und Beliebtheit
      // Die TMDB-API hat keine direkte Kombination, also wählen wir Popularität
      // und filtern dann im Code die gut bewerteten
      discoverParams.sort_by = 'popularity.desc';
    }

    // Zeitrahmenparameter  
    const currentYear = new Date().getFullYear();
    if (this.selectedTimeframe === 'new') {
      // Filme der letzten 2 Jahre
      const twoYearsAgo = currentYear - 2;
      discoverParams.primary_release_date_gte = `${twoYearsAgo}-01-01`;
    }

    console.log('API-Parameter:', discoverParams);
    
    // API-Aufruf mit den erstellten Parametern
    this.movieService.discoverVibesearchMovies(discoverParams).subscribe(
      (res) => {
        if (res.results && res.results.length > 0) {
          this.results = this.getRandomSubset(res.results, 6);
          this.loadProvidersForMovies(); // Provider laden
          this.loadFavoritesSet(); // Favoriten-Flags setzen
        } else {
          console.log('Keine Ergebnisse gefunden, versuche Fallback');
          this.loadFallbackResults();
        }
      },
      (error) => {
        console.error('Fehler beim Abrufen der Filme:', error);
        this.loadFallbackResults();
      }
    );
  }

  // Hilfsmethode für zufällige Auswahl
  getRandomSubset(array: any[], count: number): any[] {
    const shuffled = [...array].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, Math.min(count, shuffled.length));
  }

  // Fallback-Methode wenn keine Ergebnisse gefunden werden
  loadFallbackResults() {
    // Wenn nach Kurzfilmen gesucht wurde, spezialisierten Fallback verwenden
    if (this.selectedDuration === 'shortfilm') {
      const fallbackParams: any = {
        'with_runtime.lte': 40,
        vote_average_gte: 5.0,
        vote_count_gte: 5,
        sort_by: 'vote_average.desc',
        page: Math.floor(Math.random() * 3) + 1
      };
      
      this.movieService.discoverVibesearchMovies(fallbackParams).subscribe(
        (res) => {
          if (res.results && res.results.length > 0) {
            this.results = this.getRandomSubset(res.results, 6);
          } else {
            // Wenn immer noch keine Ergebnisse, Standard-Fallback
            this.movieService.getPopularMovies().subscribe((res) => {
              this.results = res.results.slice(0, 6);
              this.loadProvidersForMovies();
              this.loadFavoritesSet();
            });
          }
        },
        (error) => {
          // Bei Fehler Standard-Fallback
          this.movieService.getPopularMovies().subscribe((res) => {
            this.results = res.results.slice(0, 6);
            this.loadProvidersForMovies();
            this.loadFavoritesSet();
          });
        }
      );
    } else {
      // Bestehender Fallback für andere Dauern
      this.movieService.getPopularMovies().subscribe((res) => {
        this.results = res.results.slice(0, 6);
        this.loadProvidersForMovies();
        this.loadFavoritesSet();
      });
    }
  }

  restart() {
    this.currentStep = 1;
    this.selectedMood = null;
    this.selectedDuration = null;
    this.selectedTimeframe = null;
    this.results = [];
  }

  reshuffleMovies() {
    // Zeige einen Ladeindikator an
    this.results = [];
    
    // API-Parameter aus der vorherigen Suche wiederverwenden
    const discoverParams: any = {
      page: Math.floor(Math.random() * 10) + 1  // Andere Seite für neue Ergebnisse
    };

    // Vorherige Parameter wiederherstellen
    if (this.selectedMood && this.moodToGenreMap[this.selectedMood]) {
      discoverParams.with_genres = this.moodToGenreMap[this.selectedMood].join('|');
    }

    // Filmdauerparameter wiederherstellen
    if (this.selectedDuration === 'shortfilm') {
      discoverParams['with_runtime.lte'] = 40;
    } else if (this.selectedDuration === 'short') {
      discoverParams['with_runtime.gte'] = 40;
      discoverParams['with_runtime.lte'] = 90;
    } else if (this.selectedDuration === 'normal') {
      discoverParams['with_runtime.gte'] = 90;
      discoverParams['with_runtime.lte'] = 120;
    } else if (this.selectedDuration === 'extended') {
      discoverParams['with_runtime.gte'] = 120;
    }

    // Qualitätsfilter wiederherstellen
    discoverParams.vote_average_gte = 7.0;
    discoverParams.vote_count_gte = 200;
    
    // Zeitrahmenparameter wiederherstellen
    const currentYear = new Date().getFullYear();
    if (this.selectedTimeframe === 'new') {
      const twoYearsAgo = currentYear - 2;
      discoverParams.primary_release_date_gte = `${twoYearsAgo}-01-01`;
    } else if (this.selectedTimeframe === 'classic') {
      discoverParams.primary_release_date_gte = '1970-01-01';
      discoverParams.primary_release_date_lte = '2005-12-31';
      discoverParams.vote_average_gte = 7.0;
      discoverParams.vote_count_gte = 500;
      discoverParams.sort_by = 'vote_average.desc';
    }
    
    // API erneut aufrufen
    this.movieService.discoverVibesearchMovies(discoverParams).subscribe(
      (res) => {
        if (res.results && res.results.length > 0) {
          this.results = this.getRandomSubset(res.results, 6);
          this.loadProvidersForMovies(); // Provider laden
          this.loadFavoritesSet(); // Favoriten-Flags setzen
          this.loadWatchedMovies(); // Add this line
        } else {
          this.loadFallbackResults();
        }
      },
      (error) => {
        console.error('Fehler beim Neuladen der Filme:', error);
        this.loadFallbackResults();
      }
    );
  }

  // Ersetze einen einzelnen Film an einem bestimmten Index
  replaceMovie(index: number) {
    // API-Parameter aus der vorherigen Suche wiederverwenden
    const discoverParams: any = {
      page: Math.floor(Math.random() * 10) + 1
    };

    // Vorherige Parameter wiederherstellen (gleiche Logik wie in reshuffleMovies)
    if (this.selectedMood && this.moodToGenreMap[this.selectedMood]) {
      discoverParams.with_genres = this.moodToGenreMap[this.selectedMood].join('|');
    }

    // Filmdauerparameter wiederherstellen
    if (this.selectedDuration === 'shortfilm') {
      discoverParams['with_runtime.lte'] = 40;
    } else if (this.selectedDuration === 'short') {
      discoverParams['with_runtime.gte'] = 40;
      discoverParams['with_runtime.lte'] = 90;
    } else if (this.selectedDuration === 'normal') {
      discoverParams['with_runtime.gte'] = 90;
      discoverParams['with_runtime.lte'] = 120;
    } else if (this.selectedDuration === 'extended') {
      discoverParams['with_runtime.gte'] = 120;
    }

    // Qualitätsfilter wiederherstellen
    discoverParams.vote_average_gte = 7.0;
    discoverParams.vote_count_gte = 200;
    
    // Zeitrahmenparameter wiederherstellen
    const currentYear = new Date().getFullYear();
    if (this.selectedTimeframe === 'new') {
      const twoYearsAgo = currentYear - 2;
      discoverParams.primary_release_date_gte = `${twoYearsAgo}-01-01`;
    } else if (this.selectedTimeframe === 'classic') {
      discoverParams.primary_release_date_gte = '1970-01-01';
      discoverParams.primary_release_date_lte = '2005-12-31';
      discoverParams.vote_average_gte = 7.0;
      discoverParams.vote_count_gte = 500;
      discoverParams.sort_by = 'vote_average.desc';
    }

    // API aufrufen um einen neuen Film zu holen
    this.movieService.discoverVibesearchMovies(discoverParams).subscribe(
      (res) => {
        if (res.results && res.results.length > 0) {
          // Zufälligen Film aus Ergebnissen auswählen
          const newMovies = this.getRandomSubset(res.results.filter((m: any) => 
            // Filter bereits angezeigte Filme heraus
            !this.results.some(existing => existing.id === m.id) &&
            // Filter bereits gesehene Filme heraus
            !this.watchedIdSet.has(m.id)
          ), 1);
          
          if (newMovies.length > 0) {
            // Den Film an der angegebenen Stelle ersetzen
            this.results[index] = newMovies[0];
            
            // Provider und Statusinformationen für den neuen Film laden
            this.loadProviderForMovie(this.results[index]);
            this.loadWatchedMovies();
            this.loadFavoritesSet();
          }
        }
      },
      (error) => {
        console.error('Fehler beim Laden eines Ersatzfilms:', error);
      }
    );
  }

  // Helper-Methode, um nur für einen einzelnen Film Provider zu laden
  loadProviderForMovie(movie: any) {
    const countryCode = 'DE';
    
    movie.providersLoading = true;
    
    this.movieService.getProviders(movie.id).subscribe(
      (data) => {
        const providers = 
          data.results[countryCode]?.flatrate || 
          data.results['US']?.flatrate || 
          [];
        
        movie.providers = providers;
        movie.providersLoading = false;
      },
      (error) => {
        console.error(`Error loading providers for movie ${movie.id}:`, error);
        movie.providers = [];
        movie.providersLoading = false;
      }
    );
  }

  // Methode um Provider für alle Filme zu laden
  loadProvidersForMovies() {
    // Load providers for all movies in the results array
    if (!this.results || this.results.length === 0) return;
    
    this.results.forEach(movie => {
      this.loadProviderForMovie(movie);
    });
  }

  // Favoriten-Helper
  async loadFavoritesSet() {
    try {
      const ids = await this.prefs.getFavorites(); // erwartet number[]
      this.favoriteIdSet = new Set(ids || []);
      (this.results || []).forEach(m => m.favorite = this.favoriteIdSet.has(m.id));
    } catch (e) {
      console.warn('Could not load favorites', e);
    }
  }

  async loadWatchedMovies() {
    try {
      const historyIds = await this.prefs.getHistory();
      this.watchedIdSet = new Set(historyIds || []);
      (this.results || []).forEach(m => m.watched = this.watchedIdSet.has(m.id));
    } catch (e) {
      console.warn('Could not load watched movies', e);
    }
  }

  // Toggle Favorite aus UI
  async onToggleFavorite(movie: any, event: Event) {
    event.stopPropagation();
    try {
      await this.prefs.toggleFavorite(movie.id);
      // neu laden und flag setzen
      const ids = await this.prefs.getFavorites();
      this.favoriteIdSet = new Set(ids || []);
      movie.favorite = this.favoriteIdSet.has(movie.id);

      // Stamp kurz anzeigen, wenn gerade als Favorit markiert
      if (movie.favorite) {
        movie.showFavoriteStamp = true;
        if ((movie as any)._stampTimeout) {
          clearTimeout((movie as any)._stampTimeout);
        }
        (movie as any)._stampTimeout = setTimeout(() => {
          movie.showFavoriteStamp = false;
          delete (movie as any)._stampTimeout;
        }, 1500);
      } else {
        // falls entfavorisiert, Stamp sofort ausblenden
        movie.showFavoriteStamp = false;
        if ((movie as any)._stampTimeout) {
          clearTimeout((movie as any)._stampTimeout);
          delete (movie as any)._stampTimeout;
        }
      }
    } catch (e) {
      console.error('Error toggling favorite', e);
    }
  }

  // Add the implementation of onMarkWatched
  async onMarkWatched(movie: any, event: Event) {
    event.stopPropagation();
    
    try {
      // Wenn der Film noch nicht als gesehen markiert ist
      if (!this.watchedIdSet.has(movie.id)) {
        // Zu gesehen hinzufügen
        await this.prefs.addToHistory(movie.id);
        
        // Watched-Status aktualisieren
        await this.loadWatchedMovies();
        
        // Fade-Animation starten
        movie.fading = true;
        
        // Nach der Animation neuen Film laden
        setTimeout(() => {
          // Index des Films finden
          const index = this.results.findIndex(m => m.id === movie.id);
          if (index !== -1) {
            // Film durch einen neuen ersetzen
            this.replaceMovie(index);
          }
        }, 600);
      } 
      // Falls der Film bereits als gesehen markiert war und entfernt werden soll
      else {
        // Aus gesehen entfernen
        await this.prefs.removeFromHistory(movie.id);
        
        // Watched-Status aktualisieren
        await this.loadWatchedMovies();
      }
    } catch (e) {
      console.error('Error updating watched status', e);
    }
  }
}
