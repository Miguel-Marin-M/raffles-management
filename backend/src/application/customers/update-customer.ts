import {
  CustomerNotFoundError,
  DuplicateCustomerPhoneError,
} from '../../domain/errors/customer-errors.js';
import type { CustomerRepository } from '../../domain/ports/customer-repository.js';
import { PhoneNumber } from '../../domain/value-objects/phone-number.js';
import { toCustomerView, type CustomerView } from './customer-view.js';

export interface UpdateCustomerCommand {
  readonly actorId: string;
  readonly customerId: string;
  readonly name?: string;
  readonly phone?: string | null;
  readonly notes?: string | null;
}

/**
 * Completes the record of a customer already on file.
 *
 * Reservations often happen before the organizer has the phone number, so the
 * common use is filling it in afterwards without touching the tickets.
 */
export class UpdateCustomer {
  constructor(private readonly customers: CustomerRepository) {}

  async execute(command: UpdateCustomerCommand): Promise<CustomerView> {
    const customer = await this.customers.findById(command.customerId);
    if (customer === null || customer.ownerId !== command.actorId) {
      throw new CustomerNotFoundError(command.customerId);
    }

    if (command.phone !== undefined) {
      const phone = PhoneNumber.createOptional(command.phone);
      // The database enforces one phone per organizer; failing here gives a
      // domain error instead of a constraint violation.
      if (phone !== null) {
        const owner = await this.customers.findByPhone(command.actorId, phone.value);
        if (owner !== null && owner.id !== customer.id) {
          throw new DuplicateCustomerPhoneError(phone.value);
        }
      }
      customer.changePhone(command.phone);
    }

    if (command.name !== undefined) customer.rename(command.name);
    if (command.notes !== undefined) customer.changeNotes(command.notes);

    await this.customers.save(customer);
    return toCustomerView(customer);
  }
}
