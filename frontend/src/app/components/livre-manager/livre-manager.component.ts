import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { Livre } from '../../models/livre';
import { LivreService } from '../../services/livre.service';

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
export class LivreManagerComponent implements OnInit, OnDestroy {
  readonly currentYear = new Date().getFullYear();
  livres: Livre[] = [];
  livresAffiches: LivreAffiche[] = [];
  livreForm!: FormGroup;
  isEditMode = false;
  isModalOpen = false;
  isAuteurModalOpen = false;
  isAuteurLoading = false;
  isLoading = true;
  isSaving = false;
  deletingLivreId: number | null = null;
  confirmingLivreId: number | null = null;
  selectedLivreId: number | null = null;
  errorMessage = '';
  modalErrorMessage = '';
  auteurErrorMessage = '';
  auteurSelectionne: { id: number; nom: string } | null = null;
  livresAuteur: LivreAffiche[] = [];
  notification: { message: string } | null = null;
  isNotificationLeaving = false;
  private returnFocusElement: HTMLElement | null = null;
  private notificationTimeout: ReturnType<typeof setTimeout> | null = null;
  private notificationExitTimeout: ReturnType<typeof setTimeout> | null = null;
  private auteurRequestId = 0;

  constructor(
    private fb: FormBuilder,
    private livreService: LivreService,
    private changeDetector: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.loadLivres();
  }

  ngOnDestroy(): void {
    if (this.notificationTimeout !== null) {
      clearTimeout(this.notificationTimeout);
    }
    if (this.notificationExitTimeout !== null) {
      clearTimeout(this.notificationExitTimeout);
    }
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
    if (!this.isModalOpen) {
      return;
    }

    const modal = document.querySelector<HTMLElement>('.book-modal, .author-modal');
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
    }, { validators: this.duplicateLivreValidator() });
  }

  loadLivres(showLoading = true): void {
    this.isLoading = showLoading;
    this.errorMessage = '';
    this.changeDetector.markForCheck();

    this.livreService.getLivres().subscribe({
      next: (response) => {
        this.livres = response.data;
        this.livresAffiches = this.livres.map((livre) => ({
          ...livre,
          titreAffiche: this.capitalizeInitial(livre.titre),
          auteurAffiche: this.capitalizeInitial(livre.auteur)
        }));
        this.livreForm.updateValueAndValidity();
        this.isLoading = false;
        this.changeDetector.markForCheck();
      },
      error: (err) => {
        this.errorMessage = 'Impossible de charger les livres. Vérifiez que le serveur est disponible.';
        this.isLoading = false;
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
    livreData.titre = this.cleanIdentityValue(livreData.titre);
    livreData.auteur = this.cleanIdentityValue(livreData.auteur);
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
        if (wasCreating) {
          this.showNotification('Le livre a été ajouté à votre collection.');
        }
        this.loadLivres(false);
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

  openAuteurBooks(auteurId: number | undefined, auteurNom: string, event: MouseEvent): void {
    if (auteurId == null || this.isAuteurLoading) {
      return;
    }

    this.returnFocusElement = event.currentTarget instanceof HTMLElement
      ? event.currentTarget
      : null;
    this.auteurSelectionne = { id: auteurId, nom: auteurNom };
    this.livresAuteur = [];
    this.isAuteurModalOpen = true;
    this.loadAuteurBooks(auteurId);
    setTimeout(() => document.getElementById('author-modal-title')?.focus(), 0);
  }

  retryAuteurBooks(): void {
    if (this.auteurSelectionne) {
      this.loadAuteurBooks(this.auteurSelectionne.id);
    }
  }

  closeAuteurModal(): void {
    this.auteurRequestId += 1;
    this.isAuteurModalOpen = false;
    this.isAuteurLoading = false;
    this.auteurSelectionne = null;
    this.auteurErrorMessage = '';
    this.livresAuteur = [];
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
      control.setValue(this.capitalizeInitial(control.value));
      this.changeDetector.markForCheck();
    }
  }

  capitalizeInitial(value: string): string {
    const characters = Array.from(value.trimStart());
    const firstCharacter = characters.shift();
    return firstCharacter
      ? `${firstCharacter.toLocaleUpperCase('fr-FR')}${characters.join('')}`
      : '';
  }

  private cleanIdentityValue(value: string): string {
    return value.trim().replace(/\s+/gu, ' ');
  }

  private normalizeIdentity(value: string): string {
    return this.cleanIdentityValue(value).toLocaleLowerCase('fr-FR');
  }

  private rememberFocusedElement(): void {
    this.returnFocusElement = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
  }

  private loadAuteurBooks(auteurId: number): void {
    const requestId = ++this.auteurRequestId;
    this.isAuteurLoading = true;
    this.auteurErrorMessage = '';
    this.changeDetector.markForCheck();

    this.livreService.getLivresByAuteur(auteurId).subscribe({
      next: (response) => {
        if (requestId !== this.auteurRequestId) {
          return;
        }

        this.livresAuteur = response.data.map((livre) => ({
          ...livre,
          titreAffiche: this.capitalizeInitial(livre.titre),
          auteurAffiche: this.capitalizeInitial(livre.auteur)
        }));
        this.isAuteurLoading = false;
        this.changeDetector.markForCheck();
      },
      error: (err) => {
        if (requestId !== this.auteurRequestId) {
          return;
        }

        this.auteurErrorMessage = 'Impossible de charger les livres de cet auteur. Vérifiez votre connexion puis réessayez.';
        this.isAuteurLoading = false;
        console.error('Loading books by author failed', err);
        this.changeDetector.markForCheck();
      }
    });
  }

  dismissNotification(): void {
    if (!this.notification || this.isNotificationLeaving) {
      return;
    }

    if (this.notificationTimeout !== null) {
      clearTimeout(this.notificationTimeout);
      this.notificationTimeout = null;
    }
    this.isNotificationLeaving = true;
    this.notificationExitTimeout = setTimeout(() => {
      this.notification = null;
      this.isNotificationLeaving = false;
      this.notificationExitTimeout = null;
      this.changeDetector.markForCheck();
    }, 240);
    this.changeDetector.markForCheck();
  }

  private duplicateLivreValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const titre = String(control.get('titre')?.value ?? '').trim();
      const auteur = String(control.get('auteur')?.value ?? '').trim();
      const anneeValue = control.get('annee')?.value;
      const annee = Number(anneeValue);

      if (!titre || !auteur || anneeValue === '' || !Number.isFinite(annee)) {
        return null;
      }

      const isDuplicate = this.livres.some((livre) =>
        livre.id !== this.selectedLivreId
        && this.normalizeIdentity(livre.titre) === this.normalizeIdentity(titre)
        && this.normalizeIdentity(livre.auteur) === this.normalizeIdentity(auteur)
        && Number(livre.annee) === annee
      );

      return isDuplicate ? { duplicateLivre: true } : null;
    };
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
    if (this.notificationTimeout !== null) {
      clearTimeout(this.notificationTimeout);
    }
    if (this.notificationExitTimeout !== null) {
      clearTimeout(this.notificationExitTimeout);
      this.notificationExitTimeout = null;
    }

    this.isNotificationLeaving = false;
    this.notification = { message };
    this.notificationTimeout = setTimeout(() => this.dismissNotification(), 3000);
    this.changeDetector.markForCheck();
  }
}
