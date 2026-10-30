import { FormControl, FormGroup } from '@angular/forms';
import { Livre } from '../models/livre';
import { duplicateLivreValidator } from './livre-form.validators';
import { capitalizeInitial, cleanLivreText, normalizeLivreIdentity } from './livre-text';
import { getPaginationItems } from './pagination';

describe('livre utilities', () => {
  it('formats and normalizes French book text consistently', () => {
    expect(capitalizeInitial('  l’étranger')).toBe('L’étranger');
    expect(cleanLivreText('  Le   Petit Prince  ')).toBe('Le Petit Prince');
    expect(normalizeLivreIdentity('  LE   PETIT PRINCE ')).toBe('le petit prince');
  });

  it('generates compact page ranges with first and last pages', () => {
    expect(getPaginationItems(1, 20)).toEqual([1, 2, 'ellipsis', 19, 20]);
    expect(getPaginationItems(7, 20)).toEqual([1, 2, 'ellipsis', 6, 7, 8, 'ellipsis', 19, 20]);
    expect(getPaginationItems(3, 5)).toEqual([1, 2, 3, 4, 5]);
  });

  it('validates duplicate books while excluding the edited book', () => {
    const existing: Livre = {
      id: 5,
      titre: 'Le Petit Prince',
      auteur: 'Antoine de Saint-Exupéry',
      annee: 1943
    };
    let excludedLivreId: number | null = null;
    const form = new FormGroup({
      titre: new FormControl('  LE  PETIT PRINCE '),
      auteur: new FormControl('ANTOINE DE SAINT-EXUPÉRY'),
      annee: new FormControl(1943)
    }, {
      validators: duplicateLivreValidator(() => [existing], () => excludedLivreId)
    });

    expect(form.hasError('duplicateLivre')).toBeTrue();

    excludedLivreId = existing.id!;
    form.updateValueAndValidity();
    expect(form.hasError('duplicateLivre')).toBeFalse();
  });
});
