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

    // Mapping der Filter auf TMDb-API-Parameter
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

    // Genre beibehalten, wenn gesetzt
    if (this.currentCategoryId) {
      switch (this.currentCategoryId) {
        case 'popular':
        case 'top-rated':
        case 'trending':
        case 'all':
          // Ignorieren wir – nutzen nur Filter
          break;
        default:
          options.with_genres = parseInt(this.currentCategoryId); // fallback falls Kategorie ID = Genre ID
      }
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

}
