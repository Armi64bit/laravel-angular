import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Livre } from '../models/livre';

@Injectable({
  providedIn: 'root'
})
export class LivreService {
  private apiUrl = 'http://127.0.0.1:8000/api/books';

  constructor(private http: HttpClient) {}

  getLivres(): Observable<{ data: Livre[] }> {
    return this.http.get<{ data: Livre[] }>(this.apiUrl);
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
