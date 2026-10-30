import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, HostListener, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Livre } from '../../models/livre';
import { LivreListQuery, LivreService, LivreSortColumn } from '../../services/livre.service';
import { duplicateLivreValidator } from '../../utils/livre-form.validators';
import { capitalizeInitial, cleanLivreText } from '../../utils/livre-text';
import { getPaginationItems, PaginationItem } from '../../utils/pagination';

interface LivreAffiche extends Livre {
  titreAffiche: string;
  auteurAffiche: string;
}

@Component({
  selector: 'app-livre-manager',
  templateUrl: './livre-manager.component.html',
  styleUrls: ['./livre-manager.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LivreManagerComponent implements OnInit {
  readonly currentYear = new Date().getFullYear();
  readonly pageSizeOptions = [5, 10, 20];
  livres: Livre[] = [];
  livresAffiches: LivreAffiche[] = [];
  livresPage: LivreAffiche[] = [];
  totalBooks = 0;
  pageSize = 5;
  currentPage = 1;
  sortColumn: LivreSortColumn | null = null;
  sortDirection: 'asc' | 'desc' = 'desc';
  lastPage = 1;
  firstItem = 0;
  lastItem = 0;
  livreForm!: FormGroup;
  isEditMode = false;
  isModalOpen = false;
  isAuteurModalOpen = false;
  isLoading = true;
  isTableLoading = false;
  isSaving = false;
  deletingLivreId: number | null = null;
  confirmingLivreId: number | null = null;
  selectedLivreId: number | null = null;
  errorMessage = '';
  modalErrorMessage = '';
  auteurSelectionne: { id: number; nom: string } | null = null;
  notification: { message: string; variant: 'success' } | null = null;
  private returnFocusElement: HTMLElement | null = null;
  private livreRequestId = 0;

  constructor(
    private fb: FormBuilder,
    private livreService: LivreService,
    private changeDetector: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.loadLivres();
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.isModalOpen && !this.isSaving) {
      this.closeModal();
    } else if (this.isAuteurModalOpen) {
      this.closeAuteurModal();
    } else if (this.confirmingLivreId !== null) {
      this.cancelDelete();
    }
  }

  @HostListener('document:keydown.tab', ['$event'])
  trapModalFocus(event: KeyboardEvent): void {
    if (!this.isModalOpen && !this.isAuteurModalOpen) {
      return;
    }

    const modalSelector = this.isModalOpen ? '.book-modal' : '.author-modal';
    const modal = document.querySelector<HTMLElement>(modalSelector);
    const focusableElements = modal?.querySelectorAll<HTMLElement>(
      'button:not(:disabled), input:not(:disabled)'
    );

    if (!focusableElements?.length) {
      return;
    }

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    if (event.shiftKey && document.activeElement === firstElement) {
      event.preventDefault();
      lastElement.focus();
    } else if (!event.shiftKey && document.activeElement === lastElement) {
      event.preventDefault();
      firstElement.focus();
    }
  }

  initForm(): void {
    const currentYear = new Date().getFullYear();
    this.livreForm = this.fb.group({
      titre: ['', [Validators.required, Validators.maxLength(255)]],
      auteur: ['', [Validators.required, Validators.maxLength(255)]],
      annee: ['', [Validators.required, Validators.min(1000), Validators.max(currentYear + 1)]]
    }, { validators: duplicateLivreValidator(() => this.livres, () => this.selectedLivreId) });
  }

  loadLivres(showLoading = true, overrides: Partial<LivreListQuery> = {}): void {
    const requestId = ++this.livreRequestId;
    if (!showLoading) {
      this.confirmingLivreId = null;
    }

    const query: LivreListQuery = {
      page: overrides.page ?? this.currentPage,
      per_page: overrides.per_page ?? this.pageSize,
      sort_by: overrides.sort_by === undefined ? this.sortColumn : overrides.sort_by,
      sort_direction: overrides.sort_direction ?? this.sortDirection
    };
    this.isLoading = showLoading;
    this.isTableLoading = !showLoading;
    this.errorMessage = '';
    this.changeDetector.markForCheck();

    this.livreService.getLivres(query).subscribe({
      next: (response) => {
        if (requestId !== this.livreRequestId) {
          return;
        }

        this.livres = response.data;
        this.livresAffiches = this.livres.map((livre) => ({
          ...livre,
          titreAffiche: capitalizeInitial(livre.titre),
          auteurAffiche: capitalizeInitial(livre.auteur)
        }));
        this.livresPage = this.livresAffiches;
        this.totalBooks = response.meta.total;
        this.currentPage = response.meta.current_page;
        this.pageSize = response.meta.per_page;
        this.lastPage = Math.max(1, response.meta.last_page);
        this.firstItem = response.meta.from ?? 0;
        this.lastItem = response.meta.to ?? 0;
        this.sortColumn = response.meta.sort_by;
        this.sortDirection = response.meta.sort_direction;
        this.livreForm.updateValueAndValidity();
        this.isLoading = false;
        this.isTableLoading = false;
        this.changeDetector.markForCheck();
      },
      error: (err) => {
        if (requestId !== this.livreRequestId) {
          return;
        }

        this.errorMessage = 'Impossible de charger les livres. Vérifiez que le serveur est disponible.';
        this.isLoading = false;
        this.isTableLoading = false;
        console.error('Loading books failed', err);
        this.changeDetector.markForCheck();
      }
    });
  }

  openCreateModal(): void {
    this.rememberFocusedElement();
    this.isEditMode = false;
    this.selectedLivreId = null;
    this.modalErrorMessage = '';
    this.livreForm.reset();
    this.isModalOpen = true;
    this.changeDetector.markForCheck();
  }

  onSubmit(): void {
    if (this.isSaving) {
      return;
    }

    this.capitalizeField('titre');
    this.capitalizeField('auteur');

    if (this.livreForm.invalid) {
      this.livreForm.markAllAsTouched();
      this.changeDetector.markForCheck();
      return;
    }

    const livreData: Livre = this.livreForm.getRawValue();
    livreData.titre = cleanLivreText(livreData.titre);
    livreData.auteur = cleanLivreText(livreData.auteur);
    livreData.annee = Number(livreData.annee);

    this.isSaving = true;
    this.modalErrorMessage = '';
    this.changeDetector.markForCheck();
    const wasCreating = !this.isEditMode;

    const request = this.isEditMode && this.selectedLivreId !== null
      ? this.livreService.updateLivre(this.selectedLivreId, livreData)
      : this.livreService.addLivre(livreData);

    request.subscribe({
      next: () => {
        this.isSaving = false;
        this.closeModal();
        this.showNotification(wasCreating
          ? 'Le livre a été ajouté à votre collection.'
          : 'Le livre a été modifié avec succès.');
        this.loadLivres(false, { page: wasCreating ? 1 : this.currentPage });
        this.changeDetector.markForCheck();
      },
      error: (err) => {
        this.isSaving = false;
        this.modalErrorMessage = this.getDuplicateErrorMessage(err) ?? (this.isEditMode
          ? 'La modification a échoué. Vérifiez votre connexion puis réessayez.'
          : 'L’ajout a échoué. Vérifiez votre connexion puis réessayez.');
        console.error(this.isEditMode ? 'Update failed' : 'Creation failed', err);
        this.changeDetector.markForCheck();
      }
    });
  }

  onSubmitButtonClick(event: MouseEvent): void {
    event.preventDefault();
    this.onSubmit();
  }

  onEdit(livre: Livre): void {
    if (livre.id == null) {
      this.errorMessage = 'Ce livre ne peut pas être modifié car son identifiant est manquant.';
      return;
    }

    this.rememberFocusedElement();
    this.isEditMode = true;
    this.selectedLivreId = livre.id;
    this.modalErrorMessage = '';
    this.livreForm.patchValue({
      titre: livre.titre,
      auteur: livre.auteur,
      annee: livre.annee
    });
    this.isModalOpen = true;
    this.changeDetector.markForCheck();
  }

  trackByLivreId(index: number, livre: Livre): number | string {
    return livre.id ?? `livre-${index}`;
  }

  get totalPages(): number {
    return this.lastPage;
  }

  get paginationItems(): PaginationItem[] {
    return getPaginationItems(this.currentPage, this.totalPages);
  }

  get emptyPageRows(): number[] {
    return Array.from({ length: Math.max(0, this.pageSize - this.livresPage.length) }, (_, index) => index);
  }

  get firstVisibleBook(): number {
    return this.firstItem;
  }

  get lastVisibleBook(): number {
    return this.lastItem;
  }

  sortBy(column: LivreSortColumn): void {
    if (this.isTableLoading) {
      return;
    }

    const sortDirection = this.sortColumn === column && this.sortDirection === 'asc'
      ? 'desc'
      : 'asc';

    this.loadLivres(false, {
      page: 1,
      sort_by: column,
      sort_direction: sortDirection
    });
  }

  goToPage(page: number): void {
    if (this.isTableLoading || page === this.currentPage) {
      return;
    }

    this.loadLivres(false, { page });
  }

  changePageSize(event: Event): void {
    if (this.isTableLoading) {
      return;
    }

    const select = event.target;
    if (!(select instanceof HTMLSelectElement)) {
      return;
    }

    const pageSize = Number(select.value);
    if (!this.pageSizeOptions.includes(pageSize)) {
      return;
    }

    this.loadLivres(false, { page: 1, per_page: pageSize });
  }

  trackByPaginationItem(index: number, item: PaginationItem): string {
    return `${item}-${index}`;
  }

  openAuteurBooks(auteurId: number | undefined, auteurNom: string, event: MouseEvent): void {
    if (auteurId == null) {
      return;
    }

    this.returnFocusElement = event.currentTarget instanceof HTMLElement
      ? event.currentTarget
      : null;
    this.auteurSelectionne = { id: auteurId, nom: auteurNom };
    this.isAuteurModalOpen = true;
    setTimeout(() => document.getElementById('author-modal-title')?.focus(), 0);
  }

  closeAuteurModal(): void {
    this.isAuteurModalOpen = false;
    this.auteurSelectionne = null;
    this.returnFocusElement?.focus();
    this.returnFocusElement = null;
    this.changeDetector.markForCheck();
  }

  onDelete(id?: number, event?: MouseEvent): void {
    if (id == null || this.deletingLivreId !== null) {
      return;
    }

    this.errorMessage = '';
    this.confirmingLivreId = id;
    this.changeDetector.markForCheck();
    const row = event?.currentTarget instanceof HTMLElement
      ? event.currentTarget.closest('tr')
      : null;
    setTimeout(() => row?.querySelector<HTMLElement>('.cancel-delete-button')?.focus(), 0);
  }

  cancelDelete(): void {
    if (this.deletingLivreId === null) {
      this.confirmingLivreId = null;
      this.changeDetector.markForCheck();
    }
  }

  confirmDelete(id: number): void {
    if (this.confirmingLivreId !== id || this.deletingLivreId !== null) {
      return;
    }

    this.confirmingLivreId = null;
    this.deletingLivreId = id;
    this.errorMessage = '';
    this.changeDetector.markForCheck();
    this.livreService.deleteLivre(id).subscribe({
      next: () => {
        this.deletingLivreId = null;
        this.loadLivres(false);
        this.changeDetector.markForCheck();
      },
      error: (err) => {
        this.deletingLivreId = null;
        this.confirmingLivreId = id;
        this.errorMessage = 'La suppression a échoué. Vérifiez votre connexion puis réessayez.';
        console.error('Deletion failed', err);
        this.changeDetector.markForCheck();
      }
    });
  }

  closeModal(): void {
    if (this.isSaving) {
      return;
    }

    this.isModalOpen = false;
    this.isEditMode = false;
    this.selectedLivreId = null;
    this.modalErrorMessage = '';
    this.livreForm.reset();
    this.returnFocusElement?.focus();
    this.returnFocusElement = null;
    this.changeDetector.markForCheck();
  }

  capitalizeField(field: 'titre' | 'auteur'): void {
    const control = this.livreForm.get(field);
    if (control && typeof control.value === 'string') {
      control.setValue(capitalizeInitial(control.value));
      this.changeDetector.markForCheck();
    }
  }

  private rememberFocusedElement(): void {
    this.returnFocusElement = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
  }

  dismissNotification(): void {
    this.notification = null;
    this.changeDetector.markForCheck();
  }

  private getDuplicateErrorMessage(error: unknown): string | null {
    if (!(error instanceof HttpErrorResponse) || error.status !== 422) {
      return null;
    }

    const titleErrors = error.error?.errors?.titre;
    if (!Array.isArray(titleErrors)) {
      return null;
    }

    return titleErrors.find((message: unknown): message is string =>
      typeof message === 'string' && message.includes('existe déjà')
    ) ?? null;
  }

  private showNotification(message: string): void {
    this.notification = { message, variant: 'success' };
    this.changeDetector.markForCheck();
  }
}
