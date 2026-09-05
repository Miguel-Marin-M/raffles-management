import type { Repositories, UnitOfWork } from '../../domain/ports/unit-of-work.js';
import type { Database } from '../database/client.js';
import { DrizzleCustomerRepository } from './drizzle-customer.repository.js';
import type { DrizzleExecutor } from './drizzle-executor.js';
import { DrizzlePaymentRepository } from './drizzle-payment.repository.js';
import { DrizzleRaffleRepository } from './drizzle-raffle.repository.js';
import { DrizzleTicketEventRecorder } from './drizzle-ticket-event.recorder.js';
import { DrizzleTicketRepository } from './drizzle-ticket.repository.js';

/** Binds every repository to the same executor, be it the pool or a transaction. */
export function buildRepositories(executor: DrizzleExecutor): Repositories {
  return {
    raffles: new DrizzleRaffleRepository(executor),
    customers: new DrizzleCustomerRepository(executor),
    tickets: new DrizzleTicketRepository(executor),
    payments: new DrizzlePaymentRepository(executor),
    ticketEvents: new DrizzleTicketEventRecorder(executor),
  };
}

/**
 * Runs a use case inside a single PostgreSQL transaction.
 *
 * Reserving tickets can create a customer, insert tickets and append audit
 * events; wrapping them together is what makes a partially taken selection
 * leave no trace behind.
 */
export class DrizzleUnitOfWork implements UnitOfWork {
  constructor(private readonly db: Database) {}

  async execute<T>(work: (repositories: Repositories) => Promise<T>): Promise<T> {
    return this.db.transaction(async (tx) => work(buildRepositories(tx)));
  }
}
