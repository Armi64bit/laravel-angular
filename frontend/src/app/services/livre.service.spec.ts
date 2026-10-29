import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { Livre } from '../models/livre';
import { LivreListQuery, LivreListResponse, LivreService } from './livre.service';

describe('LivreService', () => {
  let service: LivreService;
  let httpMock: HttpTestingController;
  const apiUrl = 'http://127.0.0.1:8000/api/books';
  const livre: Livre = { id: 1, titre: 'Le Petit Prince', auteur: 'Antoine de Saint-Exupéry', annee: 1943 };
  const query: LivreListQuery = {
    page: 2,
    per_page: 5,
    sort_by: 'titre',
    sort_direction: 'asc'
  };
  const listResponse: LivreListResponse = {
    data: [livre],
    meta: {
      current_page: 2,
      from: 6,
      last_page: 2,
      per_page: 5,
      to: 6,
      total: 6,
      sort_by: 'titre',
      sort_direction: 'asc'
    }
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [LivreService]
    });

    service = TestBed.inject(LivreService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('gets the list of books', () => {
    service.getLivres(query).subscribe(response => {
      expect(response).toEqual(listResponse);
    });

    const request = httpMock.expectOne((req) =>
      req.url === apiUrl
      && req.params.get('page') === '2'
      && req.params.get('per_page') === '5'
      && req.params.get('sort_by') === 'titre'
      && req.params.get('sort_direction') === 'asc'
    );
    expect(request.request.method).toBe('GET');
    request.flush(listResponse);
  });

  it('sends the pagination and sorting state to the API', () => {
    service.getLivres(query).subscribe();

    const request = httpMock.expectOne((req) => req.url === apiUrl);
    expect(request.request.params.keys()).toEqual(['page', 'per_page', 'sort_direction', 'sort_by']);
    expect(request.request.method).toBe('GET');
    request.flush(listResponse);
  });

  it('gets books belonging to an author', () => {
    service.getLivresByAuteur(1, 2).subscribe(response => {
      expect(response.data).toEqual([livre]);
      expect(response.meta.current_page).toBe(2);
    });

    const request = httpMock.expectOne((req) =>
      req.url === `${apiUrl.replace('/books', '')}/authors/1/books`
      && req.params.get('page') === '2'
    );
    expect(request.request.method).toBe('GET');
    request.flush({
      data: [livre],
      meta: { current_page: 2, last_page: 2, per_page: 6, total: 7 }
    });
  });

  it('creates a book', () => {
    service.addLivre(livre).subscribe();

    const request = httpMock.expectOne(apiUrl);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(livre);
    request.flush({ data: livre }, { status: 201, statusText: 'Created' });
  });

  it('updates a book', () => {
    service.updateLivre(livre.id!, livre).subscribe();

    const request = httpMock.expectOne(`${apiUrl}/${livre.id}`);
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual(livre);
    request.flush({ data: livre });
  });

  it('deletes a book', () => {
    service.deleteLivre(livre.id!).subscribe();

    const request = httpMock.expectOne(`${apiUrl}/${livre.id}`);
    expect(request.request.method).toBe('DELETE');
    request.flush(null);
  });
});
