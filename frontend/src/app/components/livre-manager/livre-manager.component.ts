import { HttpErrorResponse } from '@angular/common/http';
import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { Livre } from '../../models/livre';
import { LivreService } from '../../services/livre.service';

@Component({
  selector: 'app-livre-manager',
  templateUrl: './livre-manager.component.html',
  styleUrls: ['./livre-manager.component.css']
})
export class LivreManagerComponent implements OnInit, OnDestroy {
  readonly currentYear = new Date().getFullYear();
  livres: Livre[] = [];
  livreForm!: FormGroup;
  isEditMode = false;
  isModalOpen = false;
  isLoading = true;
  isSaving = false;
  deletingLivreId: number | null = null;
  confirmingLivreId: number | null = null;
  selectedLivreId: number | null = null;
  errorMessage = '';
  modalErrorMessage = '';
  notification: { message: string } | null = null;
  isNotificationLeaving = false;
  private returnFocusElement: HTMLElement | null = null;
  private notificationTimeout: ReturnType<typeof setTimeout> | null = null;
  private notificationExitTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private fb: FormBuilder,
    private livreService: LivreService
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
    } else if (this.confirmingLivreId !== null) {
      this.cancelDelete();
    }
  }

  @HostListener('document:keydown.tab', ['$event'])
  trapModalFocus(event: KeyboardEvent): void {
    if (!this.isModalOpen) {
      return;
    }

    const modal = document.querySelector<HTMLElement>('.book-modal');
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

  loadLivres(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.livreService.getLivres().subscribe({
      next: (response) => {
        this.livres = response.data;
        this.livreForm.updateValueAndValidity();
        this.isLoading = false;
      },
      error: (err) => {
        this.errorMessage = 'Impossible de charger les livres. Vérifiez que le serveur est disponible.';
        this.isLoading = false;
        console.error('Loading books failed', err);
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
  }

  onSubmit(): void {
    if (this.isSaving) {
      return;
    }

    this.capitalizeField('titre');
    this.capitalizeField('auteur');

    if (this.livreForm.invalid) {
      this.livreForm.markAllAsTouched();
      return;
    }

    const livreData: Livre = this.livreForm.getRawValue();
    livreData.titre = livreData.titre.trim();
    livreData.auteur = livreData.auteur.trim();
    livreData.annee = Number(livreData.annee);

    this.isSaving = true;
    this.modalErrorMessage = '';
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
        this.loadLivres();
      },
      error: (err) => {
        this.isSaving = false;
        this.modalErrorMessage = this.getDuplicateErrorMessage(err) ?? (this.isEditMode
          ? 'La modification a échoué. Vérifiez votre connexion puis réessayez.'
          : 'L’ajout a échoué. Vérifiez votre connexion puis réessayez.');
        console.error(this.isEditMode ? 'Update failed' : 'Creation failed', err);
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
  }

  onDelete(id?: number): void {
    if (id == null || this.deletingLivreId !== null) {
      return;
    }

    this.errorMessage = '';
    this.confirmingLivreId = id;
  }

  cancelDelete(): void {
    if (this.deletingLivreId === null) {
      this.confirmingLivreId = null;
    }
  }

  confirmDelete(id: number): void {
    if (this.confirmingLivreId !== id || this.deletingLivreId !== null) {
      return;
    }

    this.confirmingLivreId = null;
    this.deletingLivreId = id;
    this.errorMessage = '';
    this.livreService.deleteLivre(id).subscribe({
      next: () => {
        this.deletingLivreId = null;
        this.loadLivres();
      },
      error: (err) => {
        this.deletingLivreId = null;
        this.confirmingLivreId = id;
        this.errorMessage = 'La suppression a échoué. Vérifiez votre connexion puis réessayez.';
        console.error('Deletion failed', err);
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
  }

  capitalizeField(field: 'titre' | 'auteur'): void {
    const control = this.livreForm.get(field);
    if (control && typeof control.value === 'string') {
      control.setValue(this.capitalizeInitial(control.value));
    }
  }

  capitalizeInitial(value: string): string {
    const characters = Array.from(value.trimStart());
    const firstCharacter = characters.shift();
    return firstCharacter
      ? `${firstCharacter.toLocaleUpperCase('fr-FR')}${characters.join('')}`
      : '';
  }

  private rememberFocusedElement(): void {
    this.returnFocusElement = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
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
    }, 240);
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
        && livre.titre.trim().toLocaleLowerCase('fr-FR') === titre.toLocaleLowerCase('fr-FR')
        && livre.auteur.trim().toLocaleLowerCase('fr-FR') === auteur.toLocaleLowerCase('fr-FR')
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
  }
}
