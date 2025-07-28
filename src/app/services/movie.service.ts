import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class MovieService {
  private apiUrl = 'https://api.themoviedb.org/3/search/movie';

  constructor(private http: HttpClient) {}

  searchMovies(query: string) {
    return this.http.get(this.apiUrl, {
      params: {
        api_key: environment.tmbdApiKey,
        query: query
      }
    });
  }
}
