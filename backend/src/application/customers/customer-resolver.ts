import { Customer } from '../../domain/entities/customer.js';
import { CustomerNotFoundError } from '../../domain/errors/customer-errors.js';
import type { Clock } from '../../domain/ports/clock.js';
import type { CustomerRepository } from '../../domain/ports/customer-repository.js';
import type { IdGenerator } from '../../domain/ports/id-generator.js';
import { PhoneNumber } from '../../domain/value-objects/phone-number.js';

/** Either an existing customer or the data needed to register one on the spot. */
export type CustomerInput =
  | { readonly id: string }
  | { readonly name: string; readonly phone?: string | null; readonly notes?: string | null };

/**
 * Turns the customer half of a reservation into a stored customer.
 *
 * Extracted from the reservation use case because the board lets the organizer
 * pick an existing customer or type a new one in the same sheet, and other use
 * cases need the same behaviour.
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
      return existing;
    }

    // Reuse the record instead of creating a duplicate the organizer would
    // then have to merge by hand.
    const phone = PhoneNumber.createOptional(input.phone);
    if (phone !== null) {
      const existing = await customers.findByPhone(ownerId, phone.value);
      if (existing !== null) return existing;
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
