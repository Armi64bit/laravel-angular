import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Livre } from '../../models/livre';
import { LivreService } from '../../services/livre.service';

@Component({
  selector: 'app-livre-manager',
  templateUrl: './livre-manager.component.html',
  styleUrls: ['./livre-manager.component.css']
})
export class LivreManagerComponent implements OnInit {
  livres: Livre[] = [];
  livreForm!: FormGroup;
  isEditMode = false;
  selectedLivreId: number | null = null;
  errorMessage = '';

  constructor(
    private fb: FormBuilder,
    private livreService: LivreService
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.loadLivres();
  }

  initForm(): void {
    const currentYear = new Date().getFullYear();
    this.livreForm = this.fb.group({
      titre: ['', [Validators.required, Validators.maxLength(255)]],
      auteur: ['', [Validators.required, Validators.maxLength(255)]],
      annee: ['', [Validators.required, Validators.min(1000), Validators.max(currentYear + 1)]]
    });
  }

  loadLivres(): void {
    this.livreService.getLivres().subscribe({
      next: (response) => {
        this.livres = response.data;
      },
      error: (err) => {
        this.errorMessage = 'Erreur lors du chargement des livres.';
        console.error(err);
      }
    });
  }

  onSubmit(): void {
    if (this.livreForm.invalid) {
      this.livreForm.markAllAsTouched();
      return;
    }

    const livreData: Livre = this.livreForm.value;

    if (this.isEditMode && this.selectedLivreId !== null) {
      this.livreService.updateLivre(this.selectedLivreId, livreData).subscribe({
        next: () => {
          this.loadLivres();
          this.resetForm();
        },
        error: (err) => console.error('Update failed', err)
      });
    } else {
      this.livreService.addLivre(livreData).subscribe({
        next: () => {
          this.loadLivres();
          this.resetForm();
        },
        error: (err) => console.error('Creation failed', err)
      });
    }
  }

  onEdit(livre: Livre): void {
    this.isEditMode = true;
    this.selectedLivreId = livre.id ?? null;
    this.livreForm.patchValue({
      titre: livre.titre,
      auteur: livre.auteur,
      annee: livre.annee
    });
  }

  onDelete(id?: number): void {
    if (!id) return;
    if (confirm('Êtes-vous sûr de vouloir supprimer ce livre ?')) {
      this.livreService.deleteLivre(id).subscribe({
        next: () => this.loadLivres(),
        error: (err) => console.error('Deletion failed', err)
      });
    }
  }

  resetForm(): void {
    this.isEditMode = false;
    this.selectedLivreId = null;
    this.livreForm.reset();
  }
}
