import type { CustomerRepository } from './customer-repository.js';
import type { PaymentRepository } from './payment-repository.js';
import type { RaffleRepository } from './raffle-repository.js';
import type { TicketEventRecorder } from './ticket-event-recorder.js';
import type { TicketRepository } from './ticket-repository.js';

export interface Repositories {
  readonly raffles: RaffleRepository;
  readonly customers: CustomerRepository;
  readonly tickets: TicketRepository;
  readonly payments: PaymentRepository;
  readonly ticketEvents: TicketEventRecorder;
}

/**
 * Runs a piece of work against repositories bound to a single transaction.
 *
 * Reserving tickets writes tickets, may create a customer and appends audit
 * events; either all of it lands or none of it does.
 */
export interface UnitOfWork {
  execute<T>(work: (repositories: Repositories) => Promise<T>): Promise<T>;
}

export const UNIT_OF_WORK = Symbol('UnitOfWork');
