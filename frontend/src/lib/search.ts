/** Lowercased and without accents, so "maria" finds "María". */
export function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLocaleLowerCase('es')
    .trim();
}

/** Only the digits, so "300 111 22" finds "3001112233". */
export function digitsOf(value: string): string {
  return value.replace(/\D/g, '');
}

/**
 * Matches a customer by name or phone with one query.
 *
 * The organizer types whatever they remember — half a name, the last digits of
 * a phone — so both fields are tried and the input is normalized on each side
 * rather than asking which one it is.
 */
export function matchesNameOrPhone(
  query: string,
  name: string,
  phone: string | null,
): boolean {
  const text = normalizeText(query);
  if (text === '') return true;

  if (normalizeText(name).includes(text)) return true;

  const digits = digitsOf(query);
  return digits !== '' && phone !== null && phone.includes(digits);
}
