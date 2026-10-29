import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';

interface AuteurLivreAffiche {
  id?: number;
  titreAffiche: string;
  annee: number;
}

@Component({
  selector: 'app-author-books-dialog',
  templateUrl: './author-books-dialog.component.html',
  styleUrls: ['./author-books-dialog.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AuthorBooksDialogComponent {
  @Input() auteur: { id: number; nom: string } | null = null;
  @Input() livres: AuteurLivreAffiche[] = [];
  @Input() total = 0;
  @Input() page = 1;
  @Input() lastPage = 1;
  @Input() isLoading = false;
  @Input() errorMessage = '';

  @Output() closeDialog = new EventEmitter<void>();
  @Output() pageChange = new EventEmitter<number>();
  @Output() retry = new EventEmitter<void>();

  trackByLivreId(index: number, livre: AuteurLivreAffiche): number | string {
    return livre.id ?? `livre-${index}`;
  }

  closeOnBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.closeDialog.emit();
    }
  }
}
