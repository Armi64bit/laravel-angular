export function capitalizeInitial(value: string): string {
  const characters = Array.from(value.trimStart());
  const firstCharacter = characters.shift();
  return firstCharacter
    ? `${firstCharacter.toLocaleUpperCase('fr-FR')}${characters.join('')}`
    : '';
}

export function cleanLivreText(value: string): string {
  return value.trim().replace(/\s+/gu, ' ');
}

export function normalizeLivreIdentity(value: string): string {
  return cleanLivreText(value).toLocaleLowerCase('fr-FR');
}
