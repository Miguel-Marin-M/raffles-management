import type { Customer } from '../../domain/entities/customer.js';

export interface CustomerView {
  readonly id: string;
  readonly name: string;
  readonly phone: string | null;
  readonly notes: string | null;
}

export function toCustomerView(customer: Customer): CustomerView {
  return {
    id: customer.id,
    name: customer.name,
    phone: customer.phone?.value ?? null,
    notes: customer.notes,
  };
}
