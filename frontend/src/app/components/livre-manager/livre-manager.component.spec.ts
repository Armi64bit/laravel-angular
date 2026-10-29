import { CommonModule } from '@angular/common';
import { fakeAsync, waitForAsync, ComponentFixture, TestBed, tick } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { of, Subject, throwError } from 'rxjs';
import { Livre } from '../../models/livre';
import { LivreService } from '../../services/livre.service';
import { LivreManagerComponent } from './livre-manager.component';

describe('LivreManagerComponent', () => {
  let component: LivreManagerComponent;
  let fixture: ComponentFixture<LivreManagerComponent>;
  let livreService: jasmine.SpyObj<LivreService>;
  const livre: Livre = { id: 1, titre: 'Le Petit Prince', auteur: 'Antoine de Saint-Exupéry', annee: 1943 };

  beforeEach(waitForAsync(() => {
    livreService = jasmine.createSpyObj<LivreService>(
      'LivreService',
      ['getLivres', 'addLivre', 'updateLivre', 'deleteLivre']
    );
    livreService.getLivres.and.returnValue(of({ data: [livre] }));
    livreService.addLivre.and.returnValue(of({}));
    livreService.updateLivre.and.returnValue(of({}));
    livreService.deleteLivre.and.returnValue(of({}));

    TestBed.configureTestingModule({
      imports: [CommonModule, ReactiveFormsModule],
      declarations: [LivreManagerComponent],
      providers: [{ provide: LivreService, useValue: livreService }]
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(LivreManagerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('loads and displays books', () => {
    expect(component.livres).toEqual([livre]);
    expect(fixture.nativeElement.textContent).toContain('Le Petit Prince');
  });

  it('capitalizes the first letter of displayed book titles and authors', () => {
    component.livres = [{ id: 2, titre: 'un titre', auteur: 'un auteur', annee: 2020 }];
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.book-title').textContent.trim()).toBe('Un titre');
    expect(fixture.nativeElement.querySelector('.book-author').textContent.trim()).toBe('Un auteur');
  });

  it('capitalizes title and author fields when they lose focus', () => {
    component.openCreateModal();
    component.livreForm.setValue({ titre: 'un titre', auteur: 'un auteur', annee: 2020 });
    fixture.detectChanges();

    fixture.nativeElement.querySelector('#book-title').dispatchEvent(new Event('blur'));
    fixture.nativeElement.querySelector('#book-author').dispatchEvent(new Event('blur'));
    fixture.detectChanges();

    expect(component.livreForm.value).toEqual({
      titre: 'Un titre',
      auteur: 'Un auteur',
      annee: 2020
    });
  });

  it('capitalizes title and author before submitting the form', () => {
    component.openCreateModal();
    component.livreForm.setValue({ titre: 'un titre', auteur: 'un auteur', annee: 2020 });

    component.onSubmit();

    expect(livreService.addLivre).toHaveBeenCalledWith({
      titre: 'Un titre',
      auteur: 'Un auteur',
      annee: 2020
    });
  });

  it('opens the create dialog', () => {
    fixture.nativeElement.querySelector('.add-button').click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[role="dialog"]')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('#modal-title').textContent).toContain('Ajouter un livre');
  });

  it('closes the dialog when Escape is pressed', () => {
    component.openCreateModal();
    fixture.detectChanges();

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    fixture.detectChanges();

    expect(component.isModalOpen).toBeFalse();
  });

  it('opens the edit dialog with the selected book details', () => {
    component.onEdit(livre);
    fixture.detectChanges();

    expect(component.isModalOpen).toBeTrue();
    expect(component.livreForm.value).toEqual({
      titre: livre.titre,
      auteur: livre.auteur,
      annee: livre.annee
    });
    expect(fixture.nativeElement.querySelector('#modal-title').textContent).toContain('Modifier le livre');
  });

  it('creates a book from the form', () => {
    component.livreForm.setValue({
      titre: 'L’Étranger',
      auteur: 'Albert Camus',
      annee: 1942
    });

    component.onSubmit();

    expect(livreService.addLivre).toHaveBeenCalledWith({
      titre: 'L’Étranger',
      auteur: 'Albert Camus',
      annee: 1942
    });
    expect(component.livreForm.get('titre')?.value).toBeNull();
  });

  it('creates a book when the submit button is clicked', () => {
    component.openCreateModal();
    component.livreForm.setValue({
      titre: 'L’Étranger',
      auteur: 'Albert Camus',
      annee: 1942
    });
    fixture.detectChanges();

    fixture.nativeElement.querySelector('button[type="submit"]').click();

    expect(livreService.addLivre).toHaveBeenCalledWith({
      titre: 'L’Étranger',
      auteur: 'Albert Camus',
      annee: 1942
    });
  });

  it('shows a success notification after adding a book', () => {
    component.openCreateModal();
    component.livreForm.setValue({
      titre: 'L’Étranger',
      auteur: 'Albert Camus',
      annee: 1942
    });

    component.onSubmit();
    fixture.detectChanges();

    expect(component.notification).toEqual({
      message: 'Le livre a été ajouté à votre collection.'
    });
    expect(fixture.nativeElement.querySelector('.notification-success')).not.toBeNull();
  });

  it('animates the success notification out when dismissed', fakeAsync(() => {
    component.openCreateModal();
    component.livreForm.setValue({
      titre: 'L’Étranger',
      auteur: 'Albert Camus',
      annee: 1942
    });
    component.onSubmit();
    fixture.detectChanges();

    component.dismissNotification();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.notification-toast.is-dismissing')).not.toBeNull();

    tick(240);
    fixture.detectChanges();

    expect(component.notification).toBeNull();
    expect(fixture.nativeElement.querySelector('.notification-toast')).toBeNull();
  }));

  it('automatically dismisses the success notification after three seconds', fakeAsync(() => {
    component.openCreateModal();
    component.livreForm.setValue({
      titre: 'L’Étranger',
      auteur: 'Albert Camus',
      annee: 1942
    });
    component.onSubmit();
    fixture.detectChanges();

    const progress = fixture.nativeElement.querySelector('.notification-progress');
    expect(progress).not.toBeNull();

    tick(2999);
    expect(component.isNotificationLeaving).toBeFalse();

    tick(1);
    expect(component.isNotificationLeaving).toBeTrue();

    tick(240);
    expect(component.notification).toBeNull();
  }));

  it('validates duplicate books immediately as the form values change', () => {
    component.openCreateModal();
    component.livreForm.setValue({
      titre: livre.titre,
      auteur: livre.auteur,
      annee: livre.annee
    });
    fixture.detectChanges();

    expect(component.livreForm.hasError('duplicateLivre')).toBeTrue();
    const form = fixture.nativeElement.querySelector('form');
    const alert = form.querySelector('.duplicate-error-banner');
    expect(alert.textContent).toContain('Ce livre existe déjà dans la collection.');
    expect(form.children[3]).toBe(alert);
    expect(form.children[2].classList).toContain('form-field');

    component.livreForm.patchValue({ titre: 'A different title' });

    expect(component.livreForm.hasError('duplicateLivre')).toBeFalse();
  });

  it('does not submit a duplicate book rejected by reactive validation', () => {
    component.openCreateModal();
    component.livreForm.setValue({
      titre: livre.titre,
      auteur: livre.auteur,
      annee: livre.annee
    });

    component.onSubmit();

    expect(component.livreForm.invalid).toBeTrue();
    expect(livreService.addLivre).not.toHaveBeenCalled();
    expect(component.livreForm.hasError('duplicateLivre')).toBeTrue();
  });

  it('allows editing a book without treating itself as a duplicate', () => {
    component.onEdit(livre);

    expect(component.livreForm.hasError('duplicateLivre')).toBeFalse();
    expect(component.livreForm.valid).toBeTrue();
  });

  it('shows an inline error without a notification when the API rejects a duplicate book', () => {
    spyOn(console, 'error');
    livreService.addLivre.and.returnValue(throwError(() => new HttpErrorResponse({
      status: 422,
      statusText: 'Unprocessable Entity',
      error: { errors: { titre: ['Ce livre existe déjà dans la collection.'] } }
    })));
    component.openCreateModal();
    component.livreForm.setValue({
      titre: 'A new title',
      auteur: 'A new author',
      annee: 1942
    });

    component.onSubmit();
    fixture.detectChanges();

    expect(component.modalErrorMessage).toBe('Ce livre existe déjà dans la collection.');
    expect(component.notification).toBeNull();
    expect(fixture.nativeElement.querySelector('.notification-toast')).toBeNull();
    expect(component.isModalOpen).toBeTrue();
  });

  it('shows a loading state while creating a book', () => {
    const pendingRequest = new Subject<unknown>();
    livreService.addLivre.and.returnValue(pendingRequest);
    component.openCreateModal();
    component.livreForm.setValue({
      titre: 'L’Étranger',
      auteur: 'Albert Camus',
      annee: 1942
    });

    component.onSubmit();
    fixture.detectChanges();

    expect(component.isSaving).toBeTrue();
    expect(fixture.nativeElement.textContent).toContain('Ajout en cours');

    pendingRequest.next({});
    pendingRequest.complete();
    fixture.detectChanges();

    expect(component.isSaving).toBeFalse();
    expect(component.isModalOpen).toBeFalse();
  });

  it('shows a loading state while updating a book', () => {
    const pendingRequest = new Subject<unknown>();
    livreService.updateLivre.and.returnValue(pendingRequest);
    component.onEdit(livre);
    component.livreForm.patchValue({ titre: 'Updated title' });

    component.onSubmit();
    fixture.detectChanges();

    expect(component.isSaving).toBeTrue();
    expect(fixture.nativeElement.textContent).toContain('Enregistrement');

    pendingRequest.next({});
    pendingRequest.complete();
    fixture.detectChanges();

    expect(component.isSaving).toBeFalse();
    expect(component.isModalOpen).toBeFalse();
  });

  it('updates the selected book', () => {
    component.onEdit(livre);
    component.livreForm.patchValue({ titre: 'Updated title' });

    component.onSubmit();

    expect(livreService.updateLivre).toHaveBeenCalledWith(1, {
      titre: 'Updated title',
      auteur: 'Antoine de Saint-Exupéry',
      annee: 1943
    });
    expect(component.isEditMode).toBeFalse();
  });

  it('shows an inline confirmation before deleting a book', () => {
    component.onDelete(livre.id);
    fixture.detectChanges();

    expect(component.confirmingLivreId).toBe(1);
    expect(livreService.deleteLivre).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('Supprimer ce livre ?');
  });

  it('cancels inline deletion without calling the API', () => {
    component.onDelete(livre.id);
    component.cancelDelete();

    expect(component.confirmingLivreId).toBeNull();
    expect(livreService.deleteLivre).not.toHaveBeenCalled();
  });

  it('deletes the book after inline confirmation', () => {
    component.onDelete(livre.id);
    component.confirmDelete(1);

    expect(livreService.deleteLivre).toHaveBeenCalledWith(1);
    expect(component.confirmingLivreId).toBeNull();
    expect(livreService.getLivres).toHaveBeenCalledTimes(2);
  });

  it('cancels inline deletion with Escape', () => {
    component.onDelete(livre.id);
    component.onEscape();

    expect(component.confirmingLivreId).toBeNull();
    expect(livreService.deleteLivre).not.toHaveBeenCalled();
  });
});
