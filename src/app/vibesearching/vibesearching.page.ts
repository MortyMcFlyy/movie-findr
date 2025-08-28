import { Component, OnInit } from '@angular/core';
import { MovieService } from '../services/movie.service';
import { AnimationController } from '@ionic/angular';

// Definieren Sie einen Typ für die erlaubten Stimmungen
type Mood = 'happy' | 'relaxed' | 'thrilling' | 'horror' | 'love' | 'music' | 'documentary' | 'action';

@Component({
  selector: 'app-vibesearching',
  templateUrl: './vibesearching.page.html',
  styleUrls: ['./vibesearching.page.scss'],
  standalone: false,
})
export class VibesearchingPage implements OnInit {
  currentStep = 1;
  selectedMood: Mood | null = null;
  // Alten Typ ersetzen
  // selectedDuration: 'short' | 'medium' | 'long' | null = null;

  // Neuer filmspezifischer Typ
  selectedDuration: 'shortfilm' | 'short' | 'normal' | 'extended' | 'any' | null = null;
  selectedTimeframe: string | null = null;
  results: any[] = [];
  isAnimating = false;
  
  // Mapping von Stimmungen zu Genre-IDs für die TMDB-API
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

  constructor(
    private movieService: MovieService,
    private animationCtrl: AnimationController
  ) {}

  ngOnInit() {}

  selectMood(mood: Mood) {
    if (this.isAnimating) return;
    
    this.selectedMood = mood;
    this.isAnimating = true;
    
    // Animation starten und nach Abschluss zum nächsten Schritt wechseln
    setTimeout(() => {
      this.currentStep = 2;
      this.isAnimating = false;
    }, 800);
  }
  
  selectDuration(duration: 'shortfilm' | 'short' | 'normal' | 'extended' | 'any') {
    if (this.isAnimating) return;
    
    this.selectedDuration = duration;
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
    const discoverParams: any = {
      page: Math.floor(Math.random() * 5) + 1
    };

    // Genres basierend auf Stimmung
    if (this.selectedMood && this.moodToGenreMap[this.selectedMood]) {
      discoverParams.with_genres = this.moodToGenreMap[this.selectedMood].join('|');
    }

    // Filmdauer
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
    // Bei 'any' setzen wir keine Laufzeitbeschränkung

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

    // 3. Zeitrahmenparameter hinzufügen (unverändert)
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
          // Erfolgsfall: Zufällig 6 Filme auswählen
          this.results = this.getRandomSubset(res.results, 6);
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
    this.movieService.getPopularMovies().subscribe((res) => {
      this.results = res.results.slice(0, 6);
    });
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
}
