import { DomainError } from './domain-error.js';

export class RaffleNotFoundError extends DomainError {
  readonly code = 'RAFFLE_NOT_FOUND';

  constructor(readonly raffleId: string) {
    super(`Raffle ${raffleId} does not exist`);
  }
}

/**
 * Raised when an organizer touches a raffle owned by someone else. Callers
 * surface it as a not-found response so the existence of the raffle is not
 * leaked across tenants.
 */
export class RaffleAccessDeniedError extends DomainError {
  readonly code = 'RAFFLE_ACCESS_DENIED';

  constructor(readonly raffleId: string) {
    super(`Raffle ${raffleId} belongs to another organizer`);
  }
}

export class RaffleClosedError extends DomainError {
  readonly code = 'RAFFLE_CLOSED';

  constructor(readonly raffleId: string) {
    super(`Raffle ${raffleId} is closed and no longer accepts changes to its tickets`);
  }
}

export class PrizeListError extends DomainError {
  readonly code = 'INVALID_PRIZE_LIST';

  constructor(message: string) {
    super(message);
  }
}

/**
 * Closing is the end of a raffle's life: the board becomes a record of what
 * was sold, and reopening it would let that record change after the draw.
 */
export class ClosedRaffleIsFinalError extends DomainError {
  readonly code = 'CLOSED_RAFFLE_IS_FINAL';

  constructor(readonly raffleId: string) {
    super(`Raffle ${raffleId} is closed and cannot be reopened`);
  }
}

/** Only raffles already in the history can be deleted. */
export class RaffleNotClosedError extends DomainError {
  readonly code = 'RAFFLE_NOT_CLOSED';

  constructor(readonly raffleId: string) {
    super(`Raffle ${raffleId} must be closed before it can be deleted`);
  }
}
