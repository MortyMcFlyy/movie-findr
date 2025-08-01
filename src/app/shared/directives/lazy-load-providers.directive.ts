import { Directive, ElementRef, Input, OnDestroy, OnInit } from '@angular/core';
import { MovieService } from '../../services/movie.service';

@Directive({
  selector: '[appLazyLoadProviders]',
  standalone: false
})
export class LazyLoadProvidersDirective implements OnInit, OnDestroy {
  @Input() movie: any;
  private observer !: IntersectionObserver;

  constructor(
    private el: ElementRef,
    private movieService: MovieService
  ) {}

  ngOnInit() {
    this.setupIntersectionObserver();
  }

  ngOnDestroy() {
    if (this.observer) {
      this.observer.disconnect();
    }
  }

  private setupIntersectionObserver() {
    const options = {
      root: null, // Use the viewport as root
      rootMargin: '0px',
      threshold: 0.1 // Trigger when at least 10% of the element is visible
    };

    this.observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          this.loadProviders();
          // Once loaded, no need to observe anymore
          this.observer.unobserve(entry.target);
        }
      });
    }, options);

    // Start observing the element
    this.observer.observe(this.el.nativeElement);
  }

  private loadProviders() {
    // Only load if movie has ID and providers aren't already loaded
    if (this.movie && this.movie.id && !this.movie.providers) {
      // Set loading state
      this.movie.providersLoading = true;
      
      this.movieService.getProviders(this.movie.id).subscribe(
        response => {
          const results = response.results || {};
          // First try US providers, then fallback to first available country
          const countryData = results['US'] || results[Object.keys(results)[0]];
          
          if (countryData && countryData.flatrate) {
            this.movie.providers = countryData.flatrate.slice(0, 5);
          } else if (countryData && countryData.rent) {
            this.movie.providers = countryData.rent.slice(0, 5);
          } else {
            this.movie.providers = []; // Empty array if no providers available
          }
          this.movie.providersLoading = false;
        },
        error => {
          console.error(`Error loading providers for ${this.movie.title}:`, error);
          this.movie.providers = [];
          this.movie.providersLoading = false;
        }
      );
    }
  }
}
