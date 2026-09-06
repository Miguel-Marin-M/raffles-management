const currencyFormatters = new Map<string, Intl.NumberFormat>();

/**
 * Renders an amount stored in minor units.
 *
 * Colombian pesos are quoted without decimals in everyday use, so the
 * fraction digits follow the locale rather than the storage precision.
 */
export function formatMoney(minorUnits: number, currency = 'COP'): string {
  let formatter = currencyFormatters.get(currency);
  if (formatter === undefined) {
    formatter = new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    });
    currencyFormatters.set(currency, formatter);
  }
  return formatter.format(minorUnits);
}

export function formatDate(iso: string | null): string | null {
  if (iso === null) return null;
  return new Intl.DateTimeFormat('es-CO', { dateStyle: 'long' }).format(new Date(iso));
}

/** Day and month only, the way a raffle poster announces its draw. */
export function formatDayMonth(iso: string | null): string | null {
  if (iso === null) return null;
  return new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'long' }).format(
    new Date(iso),
  );
}
