import type { CustomerSnapshot } from '../../domain/entities/customer.js';
import type { PaymentSnapshot } from '../../domain/entities/payment.js';
import type { RaffleSnapshot } from '../../domain/entities/raffle.js';
import type { TicketSnapshot } from '../../domain/entities/ticket.js';
import type { TicketEvent } from '../../domain/ports/ticket-event-recorder.js';

/**
 * Shared store behind the in-memory repositories.
 *
 * Entities are kept as snapshots rather than as live objects so that a caller
 * mutating an entity it read cannot change the stored state by accident, the
 * same way a real database would behave.
 */
export class InMemoryDatabase {
  readonly raffles = new Map<string, RaffleSnapshot>();
  readonly customers = new Map<string, CustomerSnapshot>();
  readonly tickets = new Map<string, TicketSnapshot>();
  readonly payments = new Map<string, PaymentSnapshot>();
  readonly ticketEvents: TicketEvent[] = [];

  takenNumbers(raffleId: string): Set<number> {
    const taken = new Set<number>();
    for (const ticket of this.tickets.values()) {
      if (ticket.raffleId === raffleId) taken.add(ticket.number);
    }
    return taken;
  }

  snapshot(): InMemoryDatabase {
    const copy = new InMemoryDatabase();
    for (const [id, raffle] of this.raffles) copy.raffles.set(id, raffle);
    for (const [id, customer] of this.customers) copy.customers.set(id, customer);
    for (const [id, ticket] of this.tickets) copy.tickets.set(id, ticket);
    for (const [id, payment] of this.payments) copy.payments.set(id, payment);
    copy.ticketEvents.push(...this.ticketEvents);
    return copy;
  }

  restore(other: InMemoryDatabase): void {
    this.raffles.clear();
    this.customers.clear();
    this.tickets.clear();
    this.payments.clear();
    this.ticketEvents.length = 0;
    for (const [id, raffle] of other.raffles) this.raffles.set(id, raffle);
    for (const [id, customer] of other.customers) this.customers.set(id, customer);
    for (const [id, ticket] of other.tickets) this.tickets.set(id, ticket);
    for (const [id, payment] of other.payments) this.payments.set(id, payment);
    this.ticketEvents.push(...other.ticketEvents);
  }
}
