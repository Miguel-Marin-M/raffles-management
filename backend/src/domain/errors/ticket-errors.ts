import { DomainError } from './domain-error.js';

/**
 * A number was reserved between the moment the board was read and the moment
 * the reservation was written. Reports every conflicting number so the UI can
 * highlight them at once instead of failing one by one.
 */
export class TicketsAlreadyTakenError extends DomainError {
  readonly code = 'TICKETS_ALREADY_TAKEN';

  constructor(readonly numbers: readonly number[]) {
    super(`Numbers already taken: ${numbers.join(', ')}`);
  }
}

export class TicketNumbersOutOfRangeError extends DomainError {
  readonly code = 'TICKET_NUMBERS_OUT_OF_RANGE';

  constructor(
    readonly numbers: readonly number[],
    readonly min: number,
    readonly max: number,
  ) {
    super(`Numbers outside the ${min}-${max} range: ${numbers.join(', ')}`);
  }
}

export class EmptyTicketSelectionError extends DomainError {
  readonly code = 'EMPTY_TICKET_SELECTION';

  constructor() {
    super('At least one number must be selected');
  }
}

export class TicketNotFoundError extends DomainError {
  readonly code = 'TICKET_NOT_FOUND';

  constructor(readonly ticketId: string) {
    super(`Ticket ${ticketId} does not exist`);
  }
}

export class TicketAlreadyPaidError extends DomainError {
  readonly code = 'TICKET_ALREADY_PAID';

  constructor(readonly ticketId: string) {
    super(`Ticket ${ticketId} is already fully paid`);
  }
}

export class PaymentExceedsOutstandingError extends DomainError {
  readonly code = 'PAYMENT_EXCEEDS_OUTSTANDING';

  constructor(
    readonly attemptedMinorUnits: number,
    readonly outstandingMinorUnits: number,
  ) {
    super(
      `Payment of ${attemptedMinorUnits} exceeds the outstanding ${outstandingMinorUnits}`,
    );
  }
}

/** Numbers the organizer acted on that are not reserved by anyone. */
export class TicketNumbersNotReservedError extends DomainError {
  readonly code = 'TICKET_NUMBERS_NOT_RESERVED';

  constructor(readonly numbers: readonly number[]) {
    super(`Numbers not reserved: ${numbers.join(', ')}`);
  }
}

/**
 * Releasing a ticket that already collected money would silently lose the
 * payment trail, so the refund has to be dealt with first.
 */
export class TicketHasPaymentsError extends DomainError {
  readonly code = 'TICKET_HAS_PAYMENTS';

  constructor(readonly numbers: readonly number[]) {
    super(`Numbers with payments already recorded: ${numbers.join(', ')}`);
  }
}

/**
 * A paid ticket is settled: it cannot change hands or go back on the market,
 * because either move would break the record of who paid for that number.
 */
export class PaidTicketIsFinalError extends DomainError {
  readonly code = 'PAID_TICKET_IS_FINAL';

  constructor(readonly numbers: readonly number[]) {
    super(`Numbers already paid: ${numbers.join(', ')}`);
  }
}
