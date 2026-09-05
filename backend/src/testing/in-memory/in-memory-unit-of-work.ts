import type { Repositories, UnitOfWork } from '../../domain/ports/unit-of-work.js';
import { InMemoryDatabase } from './in-memory-database.js';
import {
  InMemoryCustomerRepository,
  InMemoryRaffleRepository,
  InMemoryTicketEventRecorder,
  InMemoryTicketRepository,
} from './in-memory-repositories.js';

/**
 * Runs work against the in-memory store, rolling the whole store back when the
 * work throws. That is what lets tests assert the all-or-nothing behaviour of
 * a reservation without a real database.
 */
export class InMemoryUnitOfWork implements UnitOfWork {
  readonly repositories: Repositories;

  constructor(readonly db: InMemoryDatabase = new InMemoryDatabase()) {
    this.repositories = {
      raffles: new InMemoryRaffleRepository(db),
      customers: new InMemoryCustomerRepository(db),
      tickets: new InMemoryTicketRepository(db),
      ticketEvents: new InMemoryTicketEventRecorder(db),
    };
  }

  async execute<T>(work: (repositories: Repositories) => Promise<T>): Promise<T> {
    const backup = this.db.snapshot();
    try {
      return await work(this.repositories);
    } catch (error) {
      this.db.restore(backup);
      throw error;
    }
  }
}
