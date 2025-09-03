import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class MovieService {
  private baseUrl = 'https://api.themoviedb.org/3';
  private apiKey = environment.tmbdApiKey;
  private http = inject(HttpClient);

  // Filme
  searchMovies(query: string, page: number = 1): Observable<any> {
    return this.http.get(`${this.baseUrl}/search/movie`, {
      params: {
        api_key: this.apiKey,
        query: query,
        page: page.toString(),
        include_adult: false
      }
    });
  }

  getMovieDetails(movieId: number): Observable<any> {
    return this.http.get(`${this.baseUrl}/movie/${movieId}`, {
      params: { api_key: this.apiKey, include_adult: false }
    });
  }

  getMovieCredits(movieId: number): Observable<any> {
    return this.http.get(`${this.baseUrl}/movie/${movieId}/credits`, {
      params: { api_key: this.apiKey, include_adult: false }
    });
  }

  getSimilarMovies(movieId: number): Observable<any> {
    return this.http.get(`${this.baseUrl}/movie/${movieId}/similar`, {
      params: { api_key: this.apiKey, include_adult: false }
    });
  }

  // Trend- und Sammlungsendpunkte
  getTrendingMovies(timeWindow: 'day' | 'week' = 'week', page: number = 1): Observable<any> {
    return this.http.get(`${this.baseUrl}/trending/movie/${timeWindow}`, {
      params: {
        api_key: this.apiKey,
        page: page.toString(),
        include_adult: false
      }
    });
  }

  getPopularMovies(page: number = 1): Observable<any> {
    return this.http.get(`${this.baseUrl}/movie/popular`, {
      params: {
        api_key: this.apiKey,
        page: page.toString(),
        include_adult: false
      }
    });
  }

  getTopRatedMovies(page: number = 1): Observable<any> {
    return this.http.get(`${this.baseUrl}/movie/top_rated`, {
      params: {
        api_key: this.apiKey,
        page: page.toString(),
        include_adult: false
      }
    });
  }

  getUpcomingMovies(): Observable<any> {
    return this.http.get(`${this.baseUrl}/movie/upcoming`, {
      params: { api_key: this.apiKey, include_adult: false }
    });
  }

  getNowPlayingMovies(): Observable<any> {
    return this.http.get(`${this.baseUrl}/movie/now_playing`, {
      params: { api_key: this.apiKey, include_adult: false }
    });
  }

  // Entdecken-Funktion mit Filtern
  discoverVibesearchMovies(options: any = {}): Observable<any> {
    // Parameter für die TMDB API anpassen
    const params: any = { api_key: this.apiKey };
    
    if (options.with_genres) params.with_genres = options.with_genres;
    if (options.sort_by) params.sort_by = options.sort_by;
    if (options.page) params.page = options.page;
    
    // Bewertungsparameter
    if (options.vote_average_gte) params['vote_average.gte'] = options.vote_average_gte;
    if (options.vote_average_lte) params['vote_average.lte'] = options.vote_average_lte;
    if (options.vote_count_gte) params['vote_count.gte'] = options.vote_count_gte;
    
    // Laufzeitparameter
    if (options['with_runtime.lte']) params['with_runtime.lte'] = options['with_runtime.lte'];
    if (options['with_runtime.gte']) params['with_runtime.gte'] = options['with_runtime.gte'];
    
    // Datumsparameter
    if (options.primary_release_date_gte) params['primary_release_date.gte'] = options.primary_release_date_gte;
    if (options.primary_release_date_lte) params['primary_release_date.lte'] = options.primary_release_date_lte;
        return this.http.get(`${this.baseUrl}/discover/movie`, { params });
  }


  discoverMovies(options: { [key: string]: any } = {}): Observable<any> {
    const params: any = {
      api_key: this.apiKey,
      page: options['page']?.toString() || '1',
      include_adult: false  // NSFW-Filme ausschließen
    };

    // Parameter Whitelist
    const validParams = [
      'with_genres',
      'sort_by',
      'with_cast',
      'with_crew',
      'vote_average.gte',
      'vote_average.lte',
      'vote_count.gte',
      'with_runtime.gte',
      'with_runtime.lte',
      'primary_release_date.gte',
      'primary_release_date.lte',
      'with_original_language',
    ];

    for (const key of validParams) {
      if (options[key] !== undefined && options[key] !== null) {
        params[key] = options[key];
      }
    }

    return this.http.get(`${this.baseUrl}/discover/movie`, { params });
  }

  //Provider
  getProviders(movieId: number): Observable<any> {
    return this.http.get(`${this.baseUrl}/movie/${movieId}/watch/providers`, {
      params: { api_key: this.apiKey, include_adult: false }
    });
  }

  // Genre-Listen
  getMovieGenres(): Observable<any> {
    return this.http.get(`${this.baseUrl}/genre/movie/list`, {
      params: { api_key: this.apiKey, include_adult: false }
    });
  }

  // Video- und Bildmaterial
  getMovieVideos(movieId: number): Observable<any> {
    return this.http.get(`${this.baseUrl}/movie/${movieId}/videos`, {
      params: { api_key: this.apiKey, include_adult: false }
    });
  }

  getMovieImages(movieId: number): Observable<any> {
    return this.http.get(`${this.baseUrl}/movie/${movieId}/images`, {
      params: { api_key: this.apiKey, include_adult: false }
    });
  }

  // Personen/Cast
  searchPeople(query: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/search/person`, {
      params: {
        api_key: this.apiKey,
        query: query,
        include_adult: false
      }
    });
  }

  getPersonDetails(personId: number): Observable<any> {
    return this.http.get(`${this.baseUrl}/person/${personId}`, {
      params: { api_key: this.apiKey, include_adult: false }
    });
  }

  getPersonMovieCredits(personId: number): Observable<any> {
    return this.http.get(`${this.baseUrl}/person/${personId}/movie_credits`, {
      params: { api_key: this.apiKey, include_adult: false }
    });
  }

  // Multi-Search
  multiSearch(query: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/search/multi`, {
      params: {
        api_key: this.apiKey,
        query: query,
        include_adult: false
      }
    });
  }

  // Konfiguration für Bildergrößen
  getConfiguration(): Observable<any> {
    return this.http.get(`${this.baseUrl}/configuration`, {
      params: { api_key: this.apiKey, include_adult: false }
    });
  }
}
