import { Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { MovieService } from '../services/movie.service';

@Component({
  selector: 'app-folder',
  templateUrl: './folder.page.html',
  styleUrls: ['./folder.page.scss'],
  standalone: false,
})
export class FolderPage implements OnInit {
  public folder!: string;
  searchTerm: string = '';
  movies: any[] = [];
  currentGenreId: number | null = null;
  currentGenreName: string | null = null;

  private activatedRoute = inject(ActivatedRoute);
  constructor(private movieService: MovieService) {}

  ngOnInit() {
    this.folder = this.activatedRoute.snapshot.paramMap.get('id') as string;

    // Check for genre query parameters
    this.activatedRoute.queryParams.subscribe((params) => {
      if (params['genre']) {
        this.currentGenreId = +params['genre'];
        this.currentGenreName = params['name'] || 'Genre';
        this.searchByGenre(this.currentGenreId);
      }
    });
  }

  search() {
    if (this.searchTerm.trim() === '') return;

    // Reset genre search when performing a text search
    this.currentGenreId = null;
    this.currentGenreName = null;

    this.movieService.searchMovies(this.searchTerm).subscribe((res: any) => {
      this.movies = res.results;
    });
  }

  searchByGenre(genreId: number) {
    this.movieService.discoverMovies({ genre: genreId }).subscribe((res: any) => {
      this.movies = res.results;
    });
  }
}
