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

  constructor(private http: HttpClient) { }

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

  // // Entdecken-Funktion mit Filtern
  // discoverMovies(options: { 
  //   year?: number, 
  //   with_genres?: number, 
  //   sortBy?: string,
  //   withCast?: string,
  //   withCrew?: string,
  //   voteAverageGte?: number,
  //   page?: number
  // } = {}): Observable<any> {
  //   const params = { 
  //     api_key: this.apiKey, 
  //     page: options.page?.toString() || '1',
  //     ...options 
  //   };
  //   return this.http.get(`${this.baseUrl}/discover/movie`, { params });
  // }

  discoverMovies(options: { [key: string]: any } = {}): Observable<any> {
    const params: any = {
      api_key: this.apiKey,
      page: options['page']?.toString() || '1',
      include_adult: false  // NSFW-Filme ausschließen
    };

    // Nur gültige Parameter einfügen
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

  // Multi-Search (Filme, Serien, Personen)
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
