import { Component, OnInit, inject } from '@angular/core';
import { PreferencesService } from '../services/preferences.service';
import { MovieService } from '../services/movie.service';
import { firstValueFrom, forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AlertController } from '@ionic/angular';

type MovieCard = { id: number; title?: string; poster_path?: string; vote_average?: number };

@Component({
  selector: 'app-history',
  templateUrl: './history.page.html',
  styleUrls: ['./history.page.scss'],
  standalone: false,
})
export class HistoryPage implements OnInit {
  private preferences = inject(PreferencesService);
  private movieService = inject(MovieService);
  private alertController = inject(AlertController);

  historyIds: number[] = [];
  historyMovies: MovieCard[] = [];
  loading = false;

  async ngOnInit() {
    await this.loadHistory();
  }

  async ionViewWillEnter() { //Fired when the component routing to is about to animate into view. (https://ionicframework.com/docs/angular/lifecycle)
    await this.loadHistory();
  }

  async loadHistory() {
    this.loading = true;
    this.historyIds = await this.preferences.getHistory();
    this.historyMovies = await this.loadDetailsInBatches(this.historyIds, 20);
    this.loading = false;
  }

  private async loadDetailsInBatches(ids: number[], batchSize: number): Promise<MovieCard[]> {
    const idChunks: number[][] = [];
    for (let i = 0; i < ids.length; i += batchSize) {
      idChunks.push(ids.slice(i, i + batchSize));
    }

    const movies: MovieCard[] = [];
    for (const idChunk of idChunks) {
      const requests$ = forkJoin(
        idChunk.map(id =>
          this.movieService.getMovieDetails(id).pipe(catchError(() => of(null)))
        )
      );
      const results = await firstValueFrom(requests$);
      if (results && Array.isArray(results)) {
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
    return movies;
  }

  async onClearHistory() {
    const alert = await this.alertController.create({
      header: 'Verlauf löschen',
      message: 'Möchtest du wirklich den gesamten Verlauf löschen?',
      buttons: [
        { text: 'Abbrechen', role: 'cancel' },
        { text: 'Löschen', role: 'confirm' },
      ],
    });

    await alert.present();
    const { role } = await alert.onDidDismiss();

    if (role === 'confirm') {
      await this.preferences.clearHistory();
      await this.loadHistory();
      const done = await this.alertController.create({
        header: 'Gelöscht',
        message: 'Der Verlauf wurde entfernt.',
        buttons: ['OK'],
      });
      await done.present();
    }
  }


  async onRefresh(event: CustomEvent) {
    try {
      await this.loadHistory();
    } finally {
      // Refresher sauber beenden
      (event.target as HTMLIonRefresherElement).complete();
    }
  }

}