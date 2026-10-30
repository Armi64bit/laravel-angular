import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Livre } from '../models/livre';
import { environment } from '../../environments/environment';

export type LivreSortColumn = 'titre' | 'auteur' | 'annee';

export interface LivreListQuery {
  page: number;
  per_page: number;
  sort_by: LivreSortColumn | null;
  sort_direction: 'asc' | 'desc';
}

export interface LivreListResponse {
  data: Livre[];
  meta: {
    current_page: number;
    from: number | null;
    last_page: number;
    per_page: number;
    to: number | null;
    total: number;
    sort_by: LivreSortColumn | null;
    sort_direction: 'asc' | 'desc';
  };
}

export interface AuteurBooksResponse {
  data: Livre[];
  meta: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
}

@Injectable({
  providedIn: 'root'
})
export class LivreService {
  private readonly apiBaseUrl = environment.apiUrl;
  private readonly apiUrl = `${this.apiBaseUrl}/books`;

  constructor(private http: HttpClient) {}

  getLivres(query: LivreListQuery): Observable<LivreListResponse> {
    const params = new HttpParams()
      .set('page', query.page)
      .set('per_page', query.per_page)
      .set('sort_direction', query.sort_direction)
      .set('sort_by', query.sort_by ?? '');

    return this.http.get<LivreListResponse>(this.apiUrl, { params });
  }

  getLivresByAuteur(auteurId: number, page = 1): Observable<AuteurBooksResponse> {
    const params = new HttpParams().set('page', page);

    return this.http.get<AuteurBooksResponse>(`${this.apiBaseUrl}/authors/${auteurId}/books`, { params });
  }

  addLivre(livre: Livre): Observable<unknown> {
    return this.http.post<unknown>(this.apiUrl, livre);
  }

  updateLivre(id: number, livre: Livre): Observable<unknown> {
    return this.http.put<unknown>(`${this.apiUrl}/${id}`, livre);
  }

  deleteLivre(id: number): Observable<unknown> {
    return this.http.delete<unknown>(`${this.apiUrl}/${id}`);
  }
}
