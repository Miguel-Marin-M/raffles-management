import type { Customer } from '../entities/customer.js';

export interface CustomerRepository {
  findById(customerId: string): Promise<Customer | null>;
  findManyByIds(customerIds: readonly string[]): Promise<Customer[]>;
  findByPhone(ownerId: string, phone: string): Promise<Customer | null>;
  /** Free-text lookup over name and phone across the whole address book. */
  search(ownerId: string, term: string, limit: number): Promise<Customer[]>;
  /**
   * Same lookup, restricted to customers holding tickets in one raffle, which
   * is what the reservation sheet offers: the buyer coming back for more
   * numbers of the raffle at hand.
   */
  searchInRaffle(
    ownerId: string,
    raffleId: string,
    term: string,
    limit: number,
  ): Promise<Customer[]>;
  save(customer: Customer): Promise<void>;
}

export const CUSTOMER_REPOSITORY = Symbol('CustomerRepository');
