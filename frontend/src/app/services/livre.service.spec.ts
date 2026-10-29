import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { Livre } from '../models/livre';
import { LivreService } from './livre.service';

describe('LivreService', () => {
  let service: LivreService;
  let httpMock: HttpTestingController;
  const apiUrl = 'http://127.0.0.1:8000/api/books';
  const livre: Livre = { id: 1, titre: 'Le Petit Prince', auteur: 'Antoine de Saint-Exupéry', annee: 1943 };

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
    service.getLivres().subscribe(response => {
      expect(response.data).toEqual([livre]);
    });

    const request = httpMock.expectOne(apiUrl);
    expect(request.request.method).toBe('GET');
    request.flush({ data: [livre] });
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
