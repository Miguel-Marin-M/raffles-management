import { Customer } from '../../domain/entities/customer.js';
import {
  CustomerNotFoundError,
  DuplicateCustomerPhoneError,
} from '../../domain/errors/customer-errors.js';
import type { Clock } from '../../domain/ports/clock.js';
import type { CustomerRepository } from '../../domain/ports/customer-repository.js';
import type { IdGenerator } from '../../domain/ports/id-generator.js';
import { PhoneNumber } from '../../domain/value-objects/phone-number.js';

/**
 * Who the tickets are for.
 *
 * `id` picks somebody already on file, optionally renaming them, which is how
 * two records are merged under one name. Anything else registers a new person.
 */
export type CustomerInput =
  | { readonly id: string; readonly name?: string }
  | { readonly name: string; readonly phone?: string | null; readonly notes?: string | null };

/**
 * Turns the customer half of a reservation into a stored customer.
 *
 * A phone already on file is never reused silently: the organizer typed a new
 * name for a reason, and quietly filing the boletas under the old customer is
 * how two different people end up sharing one record. The conflict is reported
 * so the caller can ask whether to merge them.
 */
export class CustomerResolver {
  constructor(
    private readonly idGenerator: IdGenerator,
    private readonly clock: Clock,
  ) {}

  async resolve(
    customers: CustomerRepository,
    ownerId: string,
    input: CustomerInput,
  ): Promise<Customer> {
    if ('id' in input) {
      const existing = await customers.findById(input.id);
      if (existing === null || existing.ownerId !== ownerId) {
        throw new CustomerNotFoundError(input.id);
      }

      if (input.name !== undefined && input.name.trim() !== existing.name) {
        existing.rename(input.name);
        await customers.save(existing);
      }
      return existing;
    }

    const phone = PhoneNumber.createOptional(input.phone);
    if (phone !== null) {
      const owner = await customers.findByPhone(ownerId, phone.value);
      if (owner !== null) {
        // Same phone and same name is the same person taking more numbers.
        if (isSamePerson(owner.name, input.name)) return owner;
        throw new DuplicateCustomerPhoneError(phone.value, owner.id, owner.name);
      }
    }

    const customer = Customer.create({
      id: this.idGenerator.generate(),
      ownerId,
      name: input.name,
      phone: input.phone ?? null,
      notes: input.notes ?? null,
      createdAt: this.clock.now(),
    });

    await customers.save(customer);
    return customer;
  }
}

function isSamePerson(storedName: string, typedName: string): boolean {
  const normalize = (value: string): string =>
    value.trim().replace(/\s+/g, ' ').toLocaleLowerCase('es');
  return normalize(storedName) === normalize(typedName);
}
