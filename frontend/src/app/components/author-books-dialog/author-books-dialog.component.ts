import { ChangeDetectionStrategy, ChangeDetectorRef, Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { Subscription } from 'rxjs';
import { Livre } from '../../models/livre';
import { LivreService } from '../../services/livre.service';
import { capitalizeInitial } from '../../utils/livre-text';

interface AuteurLivreAffiche {
  id?: number;
  titreAffiche: string;
  annee: number;
}

interface Auteur {
  id: number;
  nom: string;
}

@Component({
  selector: 'app-author-books-dialog',
  templateUrl: './author-books-dialog.component.html',
  styleUrls: ['./author-books-dialog.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AuthorBooksDialogComponent implements OnInit, OnDestroy {
  @Input() auteur!: Auteur;

  @Output() closeDialog = new EventEmitter<void>();

  livres: AuteurLivreAffiche[] = [];
  total = 0;
  page = 1;
  lastPage = 1;
  isLoading = true;
  errorMessage = '';
  private requestId = 0;
  private requestSubscription: Subscription | null = null;

  constructor(
    private livreService: LivreService,
    private changeDetector: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadBooks(1);
  }

  ngOnDestroy(): void {
    this.requestSubscription?.unsubscribe();
  }

  trackByLivreId(index: number, livre: AuteurLivreAffiche): number | string {
    return livre.id ?? `livre-${index}`;
  }

  goToPage(page: number): void {
    if (this.isLoading || page < 1 || page > this.lastPage || page === this.page) {
      return;
    }

    this.loadBooks(page);
  }

  retry(): void {
    this.loadBooks(this.page);
  }

  closeOnBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.closeDialog.emit();
    }
  }

  private loadBooks(page: number): void {
    const requestId = ++this.requestId;
    this.requestSubscription?.unsubscribe();
    this.isLoading = true;
    this.errorMessage = '';
    this.changeDetector.markForCheck();

    this.requestSubscription = this.livreService.getLivresByAuteur(this.auteur.id, page).subscribe({
      next: (response) => {
        if (requestId !== this.requestId) {
          return;
        }

        this.livres = response.data.map((livre: Livre) => ({
          id: livre.id,
          titreAffiche: capitalizeInitial(livre.titre),
          annee: livre.annee
        }));
        this.total = response.meta.total;
        this.page = response.meta.current_page;
        this.lastPage = Math.max(1, response.meta.last_page);
        this.isLoading = false;
        this.changeDetector.markForCheck();
      },
      error: (error: unknown) => {
        if (requestId !== this.requestId) {
          return;
        }

        this.errorMessage = 'Impossible de charger les livres de cet auteur. Vérifiez votre connexion puis réessayez.';
        this.isLoading = false;
        console.error('Loading books by author failed', error);
        this.changeDetector.markForCheck();
      }
    });
  }

}
