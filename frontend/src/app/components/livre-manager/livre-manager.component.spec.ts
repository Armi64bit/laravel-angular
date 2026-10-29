import { CommonModule } from '@angular/common';
import { waitForAsync, ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { of } from 'rxjs';
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

  it('deletes the confirmed book', () => {
    spyOn(window, 'confirm').and.returnValue(true);

    component.onDelete(livre.id);

    expect(livreService.deleteLivre).toHaveBeenCalledWith(1);
    expect(livreService.getLivres).toHaveBeenCalledTimes(2);
  });

  it('does not delete when deletion is cancelled', () => {
    spyOn(window, 'confirm').and.returnValue(false);

    component.onDelete(livre.id);

    expect(livreService.deleteLivre).not.toHaveBeenCalled();
  });
});
