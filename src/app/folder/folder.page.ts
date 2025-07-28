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

  private activatedRoute = inject(ActivatedRoute);
  constructor(private movieService: MovieService) {}

  ngOnInit() {
    this.folder = this.activatedRoute.snapshot.paramMap.get('id') as string;
  }

  search() {
    if (this.searchTerm.trim() === '') return;
    this.movieService.searchMovies(this.searchTerm).subscribe((res: any) => {
      this.movies = res.results;
    });
  }
}
