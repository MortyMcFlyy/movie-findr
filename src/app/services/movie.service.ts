import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class MovieService {
  private baseUrl = 'https://api.themoviedb.org/3';
  private apiKey = environment.tmbdApiKey;

  constructor(private http: HttpClient) {}

  // Filme
  searchMovies(query: string, page: number = 1): Observable<any> {
    return this.http.get(`${this.baseUrl}/search/movie`, {
      params: {
        api_key: this.apiKey,
        query: query,
        page: page.toString()
      }
    });
  }

  getMovieDetails(movieId: number): Observable<any> {
    return this.http.get(`${this.baseUrl}/movie/${movieId}`, {
      params: { api_key: this.apiKey }
    });
  }
  
  getMovieCredits(movieId: number): Observable<any> {
    return this.http.get(`${this.baseUrl}/movie/${movieId}/credits`, {
      params: { api_key: this.apiKey }
    });
  }
  
  getSimilarMovies(movieId: number): Observable<any> {
    return this.http.get(`${this.baseUrl}/movie/${movieId}/similar`, {
      params: { api_key: this.apiKey }
    });
  }
  
  // Trend- und Sammlungsendpunkte
  getTrendingMovies(timeWindow: 'day' | 'week' = 'week', page: number = 1): Observable<any> {
    return this.http.get(`${this.baseUrl}/trending/movie/${timeWindow}`, {
      params: { 
        api_key: this.apiKey,
        page: page.toString()
      }
    });
  }
  
  getPopularMovies(page: number = 1): Observable<any> {
    return this.http.get(`${this.baseUrl}/movie/popular`, {
      params: { 
        api_key: this.apiKey,
        page: page.toString()
      }
    });
  }
  
  getTopRatedMovies(page: number = 1): Observable<any> {
    return this.http.get(`${this.baseUrl}/movie/top_rated`, {
      params: { 
        api_key: this.apiKey,
        page: page.toString()
      }
    });
  }
  
  getUpcomingMovies(): Observable<any> {
    return this.http.get(`${this.baseUrl}/movie/upcoming`, {
      params: { api_key: this.apiKey }
    });
  }
  
  getNowPlayingMovies(): Observable<any> {
    return this.http.get(`${this.baseUrl}/movie/now_playing`, {
      params: { api_key: this.apiKey }
    });
  }

  // Entdecken-Funktion mit Filtern
  discoverMovies(options: { 
    year?: number, 
    with_genres?: number, 
    sortBy?: string,
    withCast?: string,
    withCrew?: string,
    voteAverageGte?: number,
    page?: number
  } = {}): Observable<any> {
    const params = { 
      api_key: this.apiKey, 
      page: options.page?.toString() || '1',
      ...options 
    };
    return this.http.get(`${this.baseUrl}/discover/movie`, { params });
  }
  
  // Genre-Listen
  getMovieGenres(): Observable<any> {
    return this.http.get(`${this.baseUrl}/genre/movie/list`, {
      params: { api_key: this.apiKey }
    });
  }
  
  // Video- und Bildmaterial
  getMovieVideos(movieId: number): Observable<any> {
    return this.http.get(`${this.baseUrl}/movie/${movieId}/videos`, {
      params: { api_key: this.apiKey }
    });
  }
  
  getMovieImages(movieId: number): Observable<any> {
    return this.http.get(`${this.baseUrl}/movie/${movieId}/images`, {
      params: { api_key: this.apiKey }
    });
  }
  
  // Personen/Cast
  searchPeople(query: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/search/person`, {
      params: {
        api_key: this.apiKey,
        query: query
      }
    });
  }
  
  getPersonDetails(personId: number): Observable<any> {
    return this.http.get(`${this.baseUrl}/person/${personId}`, {
      params: { api_key: this.apiKey }
    });
  }
  
  getPersonMovieCredits(personId: number): Observable<any> {
    return this.http.get(`${this.baseUrl}/person/${personId}/movie_credits`, {
      params: { api_key: this.apiKey }
    });
  }
  
  // Multi-Search (Filme, Serien, Personen)
  multiSearch(query: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/search/multi`, {
      params: {
        api_key: this.apiKey,
        query: query
      }
    });
  }

  // Konfiguration für Bildergrößen
  getConfiguration(): Observable<any> {
    return this.http.get(`${this.baseUrl}/configuration`, {
      params: { api_key: this.apiKey }
    });
  }
}
