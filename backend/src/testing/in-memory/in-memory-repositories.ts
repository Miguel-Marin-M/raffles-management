import { Customer } from '../../domain/entities/customer.js';
import { Raffle } from '../../domain/entities/raffle.js';
import { Ticket } from '../../domain/entities/ticket.js';
import type { CustomerRepository } from '../../domain/ports/customer-repository.js';
import type { RaffleRepository } from '../../domain/ports/raffle-repository.js';
import type {
  TicketEvent,
  TicketEventRecorder,
} from '../../domain/ports/ticket-event-recorder.js';
import type {
  ReservationOutcome,
  TicketRepository,
} from '../../domain/ports/ticket-repository.js';
import { InMemoryDatabase } from './in-memory-database.js';

export class InMemoryRaffleRepository implements RaffleRepository {
  constructor(private readonly db: InMemoryDatabase) {}

  async findById(raffleId: string): Promise<Raffle | null> {
    const snapshot = this.db.raffles.get(raffleId);
    return snapshot === undefined ? null : Raffle.restore(snapshot);
  }

  async findAllByOwner(ownerId: string): Promise<Raffle[]> {
    return [...this.db.raffles.values()]
      .filter((raffle) => raffle.ownerId === ownerId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .map((raffle) => Raffle.restore(raffle));
  }

  async save(raffle: Raffle): Promise<void> {
    this.db.raffles.set(raffle.id, raffle.toSnapshot());
  }

  async delete(raffleId: string): Promise<void> {
    this.db.raffles.delete(raffleId);
    for (const [id, ticket] of this.db.tickets) {
      if (ticket.raffleId === raffleId) this.db.tickets.delete(id);
    }
  }
}

export class InMemoryCustomerRepository implements CustomerRepository {
  constructor(private readonly db: InMemoryDatabase) {}

  async findById(customerId: string): Promise<Customer | null> {
    const snapshot = this.db.customers.get(customerId);
    return snapshot === undefined ? null : Customer.restore(snapshot);
  }

  async findByPhone(ownerId: string, phone: string): Promise<Customer | null> {
    const match = [...this.db.customers.values()].find(
      (customer) => customer.ownerId === ownerId && customer.phone === phone,
    );
    return match === undefined ? null : Customer.restore(match);
  }

  async search(ownerId: string, term: string, limit: number): Promise<Customer[]> {
    const needle = term.trim().toLowerCase();
    return [...this.db.customers.values()]
      .filter(
        (customer) =>
          customer.ownerId === ownerId &&
          (customer.name.toLowerCase().includes(needle) ||
            (customer.phone ?? '').includes(needle)),
      )
      .slice(0, limit)
      .map((customer) => Customer.restore(customer));
  }

  async save(customer: Customer): Promise<void> {
    this.db.customers.set(customer.id, customer.toSnapshot());
  }
}

export class InMemoryTicketRepository implements TicketRepository {
  constructor(private readonly db: InMemoryDatabase) {}

  /** Mirrors the (raffle_id, number) unique constraint of the real database. */
  async reserveIfAvailable(tickets: readonly Ticket[]): Promise<ReservationOutcome> {
    const taken = this.db.takenNumbers(tickets[0]?.raffleId ?? '');
    const reserved: Ticket[] = [];
    const alreadyTaken: number[] = [];

    for (const ticket of tickets) {
      if (taken.has(ticket.number)) {
        alreadyTaken.push(ticket.number);
        continue;
      }
      taken.add(ticket.number);
      this.db.tickets.set(ticket.id, ticket.toSnapshot());
      reserved.push(ticket);
    }

    return { reserved, alreadyTaken };
  }

  async findById(ticketId: string): Promise<Ticket | null> {
    const snapshot = this.db.tickets.get(ticketId);
    return snapshot === undefined ? null : Ticket.restore(snapshot);
  }

  async findByRaffle(raffleId: string): Promise<Ticket[]> {
    return [...this.db.tickets.values()]
      .filter((ticket) => ticket.raffleId === raffleId)
      .sort((a, b) => a.number - b.number)
      .map((ticket) => Ticket.restore(ticket));
  }

  async findByNumbers(raffleId: string, numbers: readonly number[]): Promise<Ticket[]> {
    const wanted = new Set(numbers);
    return [...this.db.tickets.values()]
      .filter((ticket) => ticket.raffleId === raffleId && wanted.has(ticket.number))
      .map((ticket) => Ticket.restore(ticket));
  }

  async save(ticket: Ticket): Promise<void> {
    this.db.tickets.set(ticket.id, ticket.toSnapshot());
  }

  async delete(ticketId: string): Promise<void> {
    this.db.tickets.delete(ticketId);
  }
}

export class InMemoryTicketEventRecorder implements TicketEventRecorder {
  constructor(private readonly db: InMemoryDatabase) {}

  async record(events: readonly TicketEvent[]): Promise<void> {
    this.db.ticketEvents.push(...events);
  }
}
