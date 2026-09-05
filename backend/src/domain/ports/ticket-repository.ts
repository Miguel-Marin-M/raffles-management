import type { Ticket } from '../entities/ticket.js';

export interface ReservationOutcome {
  /** Tickets that were actually written. */
  readonly reserved: readonly Ticket[];
  /** Numbers another reservation had already taken. */
  readonly alreadyTaken: readonly number[];
}

export interface TicketRepository {
  /**
   * Reserves every number that is still free and reports the rest.
   *
   * Implementations must be atomic: two callers racing for the same number
   * must produce exactly one reservation, which is what the unique constraint
   * on (raffle_id, number) enforces in PostgreSQL.
   */
  reserveIfAvailable(tickets: readonly Ticket[]): Promise<ReservationOutcome>;

  findById(ticketId: string): Promise<Ticket | null>;
  findByRaffle(raffleId: string): Promise<Ticket[]>;
  findByNumbers(raffleId: string, numbers: readonly number[]): Promise<Ticket[]>;
  save(ticket: Ticket): Promise<void>;
  /** Releasing a ticket removes it: a free number has no row. */
  delete(ticketId: string): Promise<void>;
}

export const TICKET_REPOSITORY = Symbol('TicketRepository');
