import { CommonModule } from '@angular/common';
import { fakeAsync, waitForAsync, ComponentFixture, TestBed, tick } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { of, Subject, throwError } from 'rxjs';
import { Livre } from '../../models/livre';
import { AuteurBooksResponse, LivreListQuery, LivreListResponse, LivreService } from '../../services/livre.service';
import { AuthorBooksDialogComponent } from '../author-books-dialog/author-books-dialog.component';
import { NotificationToastComponent } from '../notification-toast/notification-toast.component';
import { LivreManagerComponent } from './livre-manager.component';

function authorBooksResponse(
  data: Livre[],
  meta: Partial<AuteurBooksResponse['meta']> = {}
): AuteurBooksResponse {
  return {
    data,
    meta: {
      current_page: 1,
      last_page: 1,
      per_page: 6,
      total: data.length,
      ...meta
    }
  };
}

function paginatedResponse(
  data: Livre[],
  meta: Partial<LivreListResponse['meta']> = {}
): LivreListResponse {
  return {
    data,
    meta: {
      current_page: 1,
      from: data.length > 0 ? 1 : null,
      last_page: 1,
      per_page: 5,
      to: data.length > 0 ? data.length : null,
      total: data.length,
      sort_by: null,
      sort_direction: 'desc',
      ...meta
    }
  };
}

function serverPage(books: Livre[], query: LivreListQuery): LivreListResponse {
  const sorted = [...books];
  const sortBy = query.sort_by;
  if (sortBy !== null) {
    sorted.sort((first, second) => {
      const comparison = sortBy === 'annee'
        ? Number(first.annee) - Number(second.annee)
        : String(first[sortBy]).localeCompare(String(second[sortBy]), 'fr-FR', { sensitivity: 'base' });

      return comparison * (query.sort_direction === 'asc' ? 1 : -1);
    });
  }

  const total = sorted.length;
  const lastPage = Math.max(1, Math.ceil(total / query.per_page));
  const currentPage = Math.min(query.page, lastPage);
  const start = (currentPage - 1) * query.per_page;
  const data = sorted.slice(start, start + query.per_page);

  return paginatedResponse(data, {
    current_page: currentPage,
    from: total > 0 ? start + 1 : null,
    last_page: lastPage,
    per_page: query.per_page,
    to: total > 0 ? start + data.length : null,
    total,
    sort_by: query.sort_by,
    sort_direction: query.sort_direction
  });
}

describe('LivreManagerComponent', () => {
  let component: LivreManagerComponent;
  let fixture: ComponentFixture<LivreManagerComponent>;
  let livreService: jasmine.SpyObj<LivreService>;
  const livre: Livre = { id: 1, auteur_id: 7, titre: 'Le Petit Prince', auteur: 'Antoine de Saint-Exupéry', annee: 1943 };

  beforeEach(waitForAsync(() => {
    livreService = jasmine.createSpyObj<LivreService>(
      'LivreService',
      ['getLivres', 'getLivresByAuteur', 'addLivre', 'updateLivre', 'deleteLivre']
    );
    livreService.getLivres.and.returnValue(of(paginatedResponse([livre])));
    livreService.getLivresByAuteur.and.returnValue(of(authorBooksResponse([livre])));
    livreService.addLivre.and.returnValue(of({}));
    livreService.updateLivre.and.returnValue(of({}));
    livreService.deleteLivre.and.returnValue(of({}));

    TestBed.configureTestingModule({
      imports: [CommonModule, ReactiveFormsModule],
      declarations: [AuthorBooksDialogComponent, LivreManagerComponent, NotificationToastComponent],
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

  it('opens the selected author dialog with that author’s books', () => {
    const secondBook: Livre = {
      id: 2,
      auteur_id: 7,
      titre: 'Le Petit Prince illustré',
      auteur: 'Antoine de Saint-Exupéry',
      annee: 1946
    };
    livreService.getLivresByAuteur.and.returnValue(of(authorBooksResponse([livre, secondBook])));

    fixture.nativeElement.querySelector('.book-author-link').click();
    fixture.detectChanges();

    expect(livreService.getLivresByAuteur).toHaveBeenCalledWith(7, 1);
    expect(fixture.nativeElement.querySelector('.author-modal')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('#author-modal-title').textContent.trim())
      .toBe('Antoine de Saint-Exupéry');
    expect(fixture.nativeElement.querySelectorAll('.author-books-list li').length).toBe(2);
    expect(fixture.nativeElement.querySelector('.author-books-list').textContent)
      .toContain('Le Petit Prince illustré');
    expect(fixture.nativeElement.querySelector('.author-books-pagination')).toBeNull();
  });

  it('paginates author books only when the author has more than one page', () => {
    const books = Array.from({ length: 8 }, (_, index): Livre => ({
      ...livre,
      id: index + 1,
      titre: `Livre ${index + 1}`
    }));
    livreService.getLivresByAuteur.and.callFake((auteurId, page = 1) => {
      const lastPage = Math.ceil(books.length / 6);
      const start = (page - 1) * 6;

      return of(authorBooksResponse(books.slice(start, start + 6), {
        current_page: page,
        last_page: lastPage,
        total: books.length
      }));
    });

    fixture.nativeElement.querySelector('.book-author-link').click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('.author-books-list li').length).toBe(6);
    expect(fixture.nativeElement.querySelector('.author-books-pagination').textContent).toContain('Page 1 sur 2');

    fixture.nativeElement.querySelector('.author-books-pagination button:last-child').click();
    fixture.detectChanges();

    expect(livreService.getLivresByAuteur).toHaveBeenCalledWith(7, 2);
    expect(fixture.nativeElement.querySelectorAll('.author-books-list li').length).toBe(2);
    expect(fixture.nativeElement.querySelector('.author-books-pagination').textContent).toContain('Page 2 sur 2');
  });

  it('shows a loading state while the author books are fetched', () => {
    const pendingRequest = new Subject<AuteurBooksResponse>();
    livreService.getLivresByAuteur.and.returnValue(pendingRequest);

    fixture.nativeElement.querySelector('.book-author-link').click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.author-books-loading')).not.toBeNull();

    pendingRequest.next(authorBooksResponse([livre]));
    pendingRequest.complete();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.author-books-loading')).toBeNull();
    expect(fixture.nativeElement.querySelector('.author-books-list li')).not.toBeNull();
  });

  it('shows a retryable error when the author books cannot be loaded', () => {
    spyOn(console, 'error');
    livreService.getLivresByAuteur.and.returnValue(throwError(() => new Error('Request failed')));

    fixture.nativeElement.querySelector('.book-author-link').click();
    fixture.detectChanges();

    const error = fixture.nativeElement.querySelector('.author-books-error');
    expect(error).not.toBeNull();
    expect(error.textContent).toContain('Impossible de charger les livres');

    livreService.getLivresByAuteur.and.returnValue(of(authorBooksResponse([livre])));
    fixture.nativeElement.querySelector('.author-books-error button').click();
    fixture.detectChanges();

    expect(livreService.getLivresByAuteur).toHaveBeenCalledTimes(2);
    expect(fixture.nativeElement.querySelector('.author-books-error')).toBeNull();
    expect(fixture.nativeElement.querySelector('.author-books-list li')).not.toBeNull();
  });

  it('closes the author dialog when Escape is pressed', () => {
    fixture.nativeElement.querySelector('.book-author-link').click();
    fixture.detectChanges();

    component.onEscape();
    fixture.detectChanges();

    expect(component.isAuteurModalOpen).toBeFalse();
    expect(fixture.nativeElement.querySelector('.author-modal')).toBeNull();
  });

  it('traps keyboard focus inside the author dialog', () => {
    const books = Array.from({ length: 8 }, (_, index): Livre => ({
      ...livre,
      id: index + 1,
      titre: `Livre ${index + 1}`
    }));
    livreService.getLivresByAuteur.and.returnValue(of(authorBooksResponse(books.slice(0, 6), {
      last_page: 2,
      total: books.length
    })));

    fixture.nativeElement.querySelector('.book-author-link').click();
    fixture.detectChanges();

    const closeButton = fixture.nativeElement.querySelector('.author-modal-close') as HTMLButtonElement;
    const nextPageButton = fixture.nativeElement.querySelector('.author-books-pagination button:last-child') as HTMLButtonElement;
    closeButton.focus();
    const shiftTab = new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, cancelable: true });

    component.trapModalFocus(shiftTab);

    expect(shiftTab.defaultPrevented).toBeTrue();
    expect(document.activeElement).toBe(nextPageButton);

    nextPageButton.focus();
    const tab = new KeyboardEvent('keydown', { key: 'Tab', cancelable: true });

    component.trapModalFocus(tab);

    expect(tab.defaultPrevented).toBeTrue();
    expect(document.activeElement).toBe(closeButton);
  });

  it('keeps the existing table visible during a background refresh', () => {
    const pendingRefresh = new Subject<LivreListResponse>();
    livreService.getLivres.and.returnValue(pendingRefresh);

    component.loadLivres(false);
    fixture.detectChanges();

    const originalRow = fixture.nativeElement.querySelector('.book-table tbody tr');
    expect(component.isLoading).toBeFalse();
    expect(fixture.nativeElement.querySelector('.book-skeleton')).toBeNull();
    expect(fixture.nativeElement.querySelector('.book-table')).not.toBeNull();

    pendingRefresh.next(paginatedResponse([{ ...livre, titre: 'Titre actualisé' }]));
    pendingRefresh.complete();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.book-title-text').textContent.trim()).toBe('Titre actualisé');
    expect(fixture.nativeElement.querySelector('.book-table tbody tr')).toBe(originalRow);
    expect(fixture.nativeElement.querySelector('.book-skeleton')).toBeNull();
  });

  it('tracks rendered books by their stable IDs', () => {
    expect(component.trackByLivreId(0, livre)).toBe(1);
  });

  it('sorts books by title and toggles the sort direction', () => {
    const books: Livre[] = [
      { ...livre, id: 1, titre: 'Zulu' },
      { ...livre, id: 2, titre: 'Alpha' },
      { ...livre, id: 3, titre: 'Bravo' }
    ];
    livreService.getLivres.and.callFake((query) => of(serverPage(books, query)));
    component.loadLivres(false);

    fixture.nativeElement.querySelector('thead .sort-button').click();
    fixture.detectChanges();

    expect(component.livresPage.map((book) => book.titre)).toEqual(['Alpha', 'Bravo', 'Zulu']);
    expect(fixture.nativeElement.querySelector('th[aria-sort="ascending"]')).not.toBeNull();
    expect(livreService.getLivres).toHaveBeenCalledWith(jasmine.objectContaining({
      sort_by: 'titre',
      sort_direction: 'asc',
      page: 1
    }));

    fixture.nativeElement.querySelector('thead .sort-button').click();
    fixture.detectChanges();

    expect(component.livresPage.map((book) => book.titre)).toEqual(['Zulu', 'Bravo', 'Alpha']);
    expect(fixture.nativeElement.querySelector('th[aria-sort="descending"]')).not.toBeNull();
  });

  it('sorts years numerically rather than alphabetically', () => {
    const books: Livre[] = [
      { ...livre, id: 1, annee: 2000 },
      { ...livre, id: 2, annee: 9000 },
      { ...livre, id: 3, annee: 1100 }
    ];
    livreService.getLivres.and.callFake((query) => of(serverPage(books, query)));
    component.loadLivres(false);

    component.sortBy('annee');

    expect(component.livresPage.map((book) => book.annee)).toEqual([1100, 2000, 9000]);
  });

  it('keeps year sorting available when the year column is hidden on mobile', () => {
    fixture.nativeElement.querySelector('.mobile-sort-year').click();

    expect(livreService.getLivres).toHaveBeenCalledWith(jasmine.objectContaining({
      sort_by: 'annee',
      page: 1
    }));
  });

  it('paginates the collection and changes the page size', () => {
    const books = Array.from({ length: 12 }, (_, index): Livre => ({
      ...livre,
      id: index + 1,
      titre: `Livre ${index + 1}`
    }));
    livreService.getLivres.and.callFake((query) => of(serverPage(books, query)));
    component.loadLivres(false);
    fixture.detectChanges();

    expect((fixture.nativeElement.querySelector('#book-page-size') as HTMLSelectElement).value).toBe('5');
    expect(fixture.nativeElement.querySelectorAll('.book-table tbody tr').length).toBe(5);
    expect(fixture.nativeElement.querySelectorAll('.book-table tbody tr:not(.table-placeholder)').length).toBe(5);
    expect(livreService.getLivres).toHaveBeenCalledWith(jasmine.objectContaining({ per_page: 5 }));
    expect(component.firstVisibleBook).toBe(1);
    expect(component.lastVisibleBook).toBe(5);

    component.goToPage(2);
    fixture.detectChanges();

    expect(component.livresPage.map((book) => book.id)).toEqual([6, 7, 8, 9, 10]);
    expect(fixture.nativeElement.querySelectorAll('.book-table tbody tr').length).toBe(5);
    expect(component.firstVisibleBook).toBe(6);
    expect(component.lastVisibleBook).toBe(10);

    const pageSize = fixture.nativeElement.querySelector('#book-page-size') as HTMLSelectElement;
    pageSize.value = '20';
    pageSize.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    expect(component.currentPage).toBe(1);
    expect(fixture.nativeElement.querySelectorAll('.book-table tbody tr').length).toBe(20);
    expect(fixture.nativeElement.querySelectorAll('.book-table tbody tr:not(.table-placeholder)').length).toBe(12);
  });

  it('keeps the first and last pages visible with ellipses around the current page', () => {
    const books = Array.from({ length: 100 }, (_, index): Livre => ({
      ...livre,
      id: index + 1,
      titre: `Livre ${index + 1}`
    }));
    component.pageSize = 5;
    livreService.getLivres.and.callFake((query) => of(serverPage(books, query)));
    component.loadLivres(false);
    fixture.detectChanges();

    expect(component.paginationItems).toEqual([1, 2, 'ellipsis', 19, 20]);

    fixture.nativeElement.querySelector('[aria-label="Page suivante"]').click();
    fixture.detectChanges();

    expect(component.currentPage).toBe(2);
    expect(component.paginationItems).toEqual([1, 2, 3, 'ellipsis', 19, 20]);

    for (let page = 0; page < 5; page += 1) {
      fixture.nativeElement.querySelector('[aria-label="Page suivante"]').click();
      fixture.detectChanges();
    }

    expect(component.currentPage).toBe(7);
    expect(component.paginationItems).toEqual([1, 2, 'ellipsis', 6, 7, 8, 'ellipsis', 19, 20]);
  });

  it('sorts from the API and clamps the page after a refreshed collection shrinks', () => {
    const books = Array.from({ length: 12 }, (_, index): Livre => ({
      ...livre,
      id: index + 1,
      titre: `Livre ${index + 1}`
    }));
    livreService.getLivres.and.callFake((query) => of(serverPage(books, query)));
    component.loadLivres(false);
    component.goToPage(2);

    component.sortBy('titre');

    expect(component.currentPage).toBe(1);
    expect(livreService.getLivres).toHaveBeenCalledWith(jasmine.objectContaining({
      page: 1,
      sort_by: 'titre',
      sort_direction: 'asc'
    }));

    component.goToPage(2);
    livreService.getLivres.and.callFake((query) => of(serverPage(books.slice(0, 3), query)));
    component.loadLivres(false);

    expect(component.currentPage).toBe(1);
    expect(component.livresPage.length).toBe(3);
  });

  it('capitalizes the first letter of displayed book titles and authors', () => {
    livreService.getLivres.and.returnValue(of(paginatedResponse([{
      id: 2,
      titre: 'un titre',
      auteur: 'un auteur',
      annee: 2020
    }])));
    component.loadLivres(false);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.book-title-text').textContent.trim()).toBe('Un titre');
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
      message: 'Le livre a été ajouté à votre collection.',
      variant: 'success'
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

    fixture.nativeElement.querySelector('.notification-close').click();
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
    expect(fixture.nativeElement.querySelector('.notification-toast.is-dismissing')).toBeNull();

    tick(1);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.notification-toast.is-dismissing')).not.toBeNull();

    tick(240);
    fixture.detectChanges();
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

  it('treats case and repeated whitespace as the same book identity', () => {
    component.openCreateModal();
    component.livreForm.setValue({
      titre: '  le   petit prince ',
      auteur: 'ANTOINE  DE SAINT-EXUPÉRY',
      annee: 1943
    });

    expect(component.livreForm.hasError('duplicateLivre')).toBeTrue();

    component.livreForm.patchValue({ auteur: 'A different author' });
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
    fixture.detectChanges();

    expect(livreService.updateLivre).toHaveBeenCalledWith(1, {
      titre: 'Updated title',
      auteur: 'Antoine de Saint-Exupéry',
      annee: 1943
    });
    expect(component.isEditMode).toBeFalse();
    expect(fixture.nativeElement.querySelector('.notification-success p').textContent.trim())
      .toBe('Le livre a été modifié avec succès.');
  });

  it('shows an inline confirmation before deleting a book', () => {
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.delete-confirmation').getAttribute('aria-hidden')).toBe('true');

    component.onDelete(livre.id);
    fixture.detectChanges();

    expect(component.confirmingLivreId).toBe(1);
    expect(livreService.deleteLivre).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('Supprimer ce livre ?');
    expect(fixture.nativeElement.querySelector('.row-action-content').classList).toContain('is-confirming');
    expect(fixture.nativeElement.querySelector('.row-action-buttons').getAttribute('aria-hidden')).toBe('true');
    expect(fixture.nativeElement.querySelector('.delete-confirmation').getAttribute('aria-hidden')).toBe('false');
    expect(fixture.nativeElement.querySelector('.delete-button')).not.toBeNull();
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
