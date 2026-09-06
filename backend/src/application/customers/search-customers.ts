import type { CustomerRepository } from '../../domain/ports/customer-repository.js';
import { toCustomerView, type CustomerView } from './customer-view.js';

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;

/**
 * Looks up the organizer's customers by name or phone.
 *
 * Feeds the reservation sheet, where the organizer types a name and picks the
 * existing person instead of creating a duplicate record.
 */
export class SearchCustomers {
  constructor(private readonly customers: CustomerRepository) {}

  async execute(input: {
    actorId: string;
    term: string;
    limit?: number;
  }): Promise<CustomerView[]> {
    const term = input.term.trim();
    if (term === '') return [];

    const limit = Math.min(input.limit ?? DEFAULT_LIMIT, MAX_LIMIT);
    const customers = await this.customers.search(input.actorId, term, limit);
    return customers.map((customer) => toCustomerView(customer));
  }
}
