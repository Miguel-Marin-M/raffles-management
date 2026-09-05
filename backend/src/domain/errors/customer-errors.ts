import { DomainError } from './domain-error.js';

export class CustomerNotFoundError extends DomainError {
  readonly code = 'CUSTOMER_NOT_FOUND';

  constructor(readonly customerId: string) {
    super(`Customer ${customerId} does not exist`);
  }
}

/** The organizer already has a customer registered with the same phone. */
export class DuplicateCustomerPhoneError extends DomainError {
  readonly code = 'DUPLICATE_CUSTOMER_PHONE';

  constructor(readonly phone: string) {
    super(`A customer with phone ${phone} already exists`);
  }
}
