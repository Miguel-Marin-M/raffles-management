import type { Customer } from '../entities/customer.js';

export interface CustomerRepository {
  findById(customerId: string): Promise<Customer | null>;
  findByPhone(ownerId: string, phone: string): Promise<Customer | null>;
  /** Free-text lookup over name and phone, used by the reservation sheet. */
  search(ownerId: string, term: string, limit: number): Promise<Customer[]>;
  save(customer: Customer): Promise<void>;
}

export const CUSTOMER_REPOSITORY = Symbol('CustomerRepository');
