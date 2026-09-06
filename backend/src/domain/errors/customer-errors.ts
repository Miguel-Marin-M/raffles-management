import { DomainError } from './domain-error.js';

export class CustomerNotFoundError extends DomainError {
  readonly code = 'CUSTOMER_NOT_FOUND';

  constructor(readonly customerId: string) {
    super(`Customer ${customerId} does not exist`);
  }
}

/**
 * The organizer already has a customer registered with the same phone.
 *
 * Carries who owns it so the caller can offer to merge both records instead of
 * making the organizer go looking for the duplicate.
 */
export class DuplicateCustomerPhoneError extends DomainError {
  readonly code = 'DUPLICATE_CUSTOMER_PHONE';

  constructor(
    readonly phone: string,
    readonly customerId: string,
    readonly customerName: string,
  ) {
    super(`Phone ${phone} already belongs to ${customerName}`);
  }
}
