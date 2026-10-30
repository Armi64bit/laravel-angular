import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { Livre } from '../models/livre';
import { normalizeLivreIdentity } from './livre-text';

export function duplicateLivreValidator(
  getLivres: () => readonly Livre[],
  getExcludedLivreId: () => number | null
): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const titre = String(control.get('titre')?.value ?? '').trim();
    const auteur = String(control.get('auteur')?.value ?? '').trim();
    const anneeValue = control.get('annee')?.value;
    const annee = Number(anneeValue);

    if (!titre || !auteur || anneeValue === '' || !Number.isFinite(annee)) {
      return null;
    }

    const normalizedTitre = normalizeLivreIdentity(titre);
    const normalizedAuteur = normalizeLivreIdentity(auteur);
    const excludedLivreId = getExcludedLivreId();
    const isDuplicate = getLivres().some((livre) =>
      livre.id !== excludedLivreId
      && normalizeLivreIdentity(livre.titre) === normalizedTitre
      && normalizeLivreIdentity(livre.auteur) === normalizedAuteur
      && Number(livre.annee) === annee
    );

    return isDuplicate ? { duplicateLivre: true } : null;
  };
}
