import { Component, inject, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { MovieService } from '../services/movie.service';
import {
  InfiniteScrollCustomEvent,
  IonAvatar,
  IonContent,
  IonInfiniteScroll,
  IonInfiniteScrollContent,
  IonItem,
  IonLabel,
  IonList,
} from '@ionic/angular/standalone';
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
  currentGenreId: number | null = null;
  currentGenreName: string | null = null;
  currentCategoryId: string | null = null;
  currentPage: number = 1;
  totalPages: number = 0;

  private activatedRoute = inject(ActivatedRoute);
  constructor(private movieService: MovieService) { }

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
    });
  }

  searchByGenre(genreId: number) {
    this.movieService.discoverMovies({ 
      with_genres: genreId,
      page: this.currentPage 
     }).subscribe((res: any) => {
      this.movies =  [...this.movies, ...res.results];
      this.totalPages = res.total_pages;
    });
  }
 searchByCategory(categoryId: string) {
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
        this.movieService.discoverMovies({ page: this.currentPage }).subscribe((res: any) => {
          this.movies = [...this.movies, ...res.results];
          this.totalPages = res.total_pages;
        });
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
    
    if (this.currentGenreId) {
      this.searchByGenre(this.currentGenreId);
    } else if (this.currentCategoryId) {
      this.searchByCategory(this.currentCategoryId);
    } else if (this.searchTerm) {
      this.movieService.searchMovies(this.searchTerm, this.currentPage).subscribe((res: any) => {
        this.movies = [...this.movies, ...res.results];
        event.target.complete();
      });
    }
    
    event.target.complete();
  }
}
