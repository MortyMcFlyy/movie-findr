import { Component, OnInit, inject } from '@angular/core';
import { PreferencesService } from '../services/preferences.service';
import { MovieService } from '../services/movie.service';
import { firstValueFrom, forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AlertController } from '@ionic/angular';

type MovieCard = { id: number; title?: string; poster_path?: string; vote_average?: number };

@Component({
  selector: 'app-favorites',
  templateUrl: './favorites.page.html',
  styleUrls: ['./favorites.page.scss'],
  standalone: false,
})
export class FavoritesPage implements OnInit {
  private preferences = inject(PreferencesService);
  private movieService = inject(MovieService);
  private alertController = inject(AlertController);

  favoriteIds: number[] = [];
  favoriteMovies: MovieCard[] = [];
  loading = false;

  async ngOnInit() {
    await this.loadFavorites();
  }

  async ionViewWillEnter() { //Fired when the component routing to is about to animate into view. (https://ionicframework.com/docs/angular/lifecycle)
    // Beim Zurückkehren aktualisieren, falls sich Favoriten geändert haben
    await this.loadFavorites();
  }

  async loadFavorites() {
    this.loading = true;
    this.favoriteIds = await this.preferences.getFavorites();

    // Details in Batches laden
    const batchSize = 20;
    const idChunks: number[][] = [];
    for (let i = 0; i < this.favoriteIds.length; i += batchSize) {
      idChunks.push(this.favoriteIds.slice(i, i + batchSize));
    }

    const movies: MovieCard[] = [];
    for (const chunk of idChunks) {
      const requests$ = forkJoin(
        chunk.map(id =>
          this.movieService.getMovieDetails(id).pipe(catchError(() => of(null)))
        )
      );
      const results = await firstValueFrom(requests$);
      if (Array.isArray(results)) {
        for (const movie of results) {
          if (movie) {
            movies.push({
              id: movie.id,
              title: movie.title ?? movie.name,
              poster_path: movie.poster_path,
              vote_average: movie.vote_average,
            });
          }
        }
      }
    }

    this.favoriteMovies = movies;
    this.loading = false;
  }

  async onToggleFavorite(id: number) {
    await this.preferences.toggleFavorite(id);
    await this.loadFavorites(); // Liste aktualisieren
  }


  async onClearFavorites() {
    const alert = await this.alertController.create({
      header: 'Favoriten löschen',
      message: 'Möchtest du wirklich alle Favoriten löschen?',
      buttons: [
        { text: 'Abbrechen', role: 'cancel' },
        { text: 'Löschen', role: 'confirm' },
      ],
    });

    await alert.present();
    const { role } = await alert.onDidDismiss();

    if (role === 'confirm') {
      await this.preferences.clearFavorites();
      await this.loadFavorites();
      const done = await this.alertController.create({
        header: 'Gelöscht',
        message: 'Favoriten wurden entfernt.',
        buttons: ['OK'],
      });
      await done.present();
    }
  }

  async onRefresh(event: CustomEvent) {
    try {
      await this.loadFavorites();
    } finally {
      (event.target as HTMLIonRefresherElement).complete();
    }
  }

}

