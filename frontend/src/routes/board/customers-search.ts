export interface CustomersSearch {
  /** Absent means the first page. */
  readonly page?: number;
  /** Absent means no filter. */
  readonly q?: string;
}

/**
 * Reads the customers list state out of the URL.
 *
 * Keeping the filter and the page in the address means a reload, a shared link
 * or the back button all land on the same list. Defaults are left out so an
 * untouched list keeps a clean URL, and anything unusable — `page=abc`,
 * `page=0`, a blank query — falls back to the default instead of failing.
 */
export function parseCustomersSearch(raw: Record<string, unknown>): CustomersSearch {
  const page = Number(raw['page']);
  const query = typeof raw['q'] === 'string' ? raw['q'] : '';

  return {
    ...(Number.isInteger(page) && page > 1 ? { page } : {}),
    ...(query.trim() === '' ? {} : { q: query }),
  };
}
