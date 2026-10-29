import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Livre } from '../models/livre';

@Injectable({
  providedIn: 'root'
})
export class LivreService {
  // Points to Laravel backend API route
  private apiUrl = 'http://127.0.0.1:8000/api/books';

  constructor(private http: HttpClient) {}

  getLivres(): Observable<{ data: Livre[] }> {
    return this.http.get<{ data: Livre[] }>(this.apiUrl);
  }

  addLivre(livre: Livre): Observable<any> {
    return this.http.post<any>(this.apiUrl, livre);
  }

  updateLivre(id: number, livre: Livre): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/${id}`, livre);
  }

  deleteLivre(id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/${id}`);
  }
}