import { and, eq, inArray } from 'drizzle-orm';

import { Ticket } from '../../domain/entities/ticket.js';
import type {
  ReservationOutcome,
  TicketRepository,
} from '../../domain/ports/ticket-repository.js';
import { raffles, tickets } from '../database/schema/index.js';
import type { TicketRow } from '../database/schema/index.js';
import type { DrizzleExecutor } from './drizzle-executor.js';

function toTicket(row: TicketRow, currency: string): Ticket {
  return Ticket.restore({
    id: row.id,
    raffleId: row.raffleId,
    number: row.number,
    customerId: row.customerId,
    status: row.status,
    amountPaidMinorUnits: row.amountPaidCents,
    currency,
    notes: row.notes,
    reservedAt: row.reservedAt,
    paidAt: row.paidAt,
    createdBy: row.createdBy,
  });
}

export class DrizzleTicketRepository implements TicketRepository {
  constructor(private readonly db: DrizzleExecutor) {}

  /**
   * Inserts the free numbers and skips the taken ones in a single statement.
   *
   * `on conflict do nothing` against the (raffle_id, number) unique constraint
   * is what makes this race-proof: two devices reserving the same number end up
   * with exactly one row, and the loser learns which numbers it lost.
   */
  async reserveIfAvailable(candidates: readonly Ticket[]): Promise<ReservationOutcome> {
    if (candidates.length === 0) return { reserved: [], alreadyTaken: [] };

    const inserted = await this.db
      .insert(tickets)
      .values(
        candidates.map((ticket) => {
          const snapshot = ticket.toSnapshot();
          return {
            id: snapshot.id,
            raffleId: snapshot.raffleId,
            number: snapshot.number,
            customerId: snapshot.customerId,
            status: snapshot.status,
            amountPaidCents: snapshot.amountPaidMinorUnits,
            notes: snapshot.notes,
            reservedAt: snapshot.reservedAt,
            paidAt: snapshot.paidAt,
            createdBy: snapshot.createdBy,
          };
        }),
      )
      .onConflictDoNothing({ target: [tickets.raffleId, tickets.number] })
      .returning({ number: tickets.number });

    const insertedNumbers = new Set(inserted.map((row) => row.number));
    return {
      reserved: candidates.filter((ticket) => insertedNumbers.has(ticket.number)),
      alreadyTaken: candidates
        .filter((ticket) => !insertedNumbers.has(ticket.number))
        .map((ticket) => ticket.number),
    };
  }

  async findById(ticketId: string): Promise<Ticket | null> {
    const row = await this.db.query.tickets.findFirst({
      where: eq(tickets.id, ticketId),
      with: { raffle: { columns: { currency: true } } },
    });
    return row === undefined ? null : toTicket(row, row.raffle.currency);
  }

  async findByRaffle(raffleId: string): Promise<Ticket[]> {
    const currency = await this.currencyOf(raffleId);
    const rows = await this.db.query.tickets.findMany({
      where: eq(tickets.raffleId, raffleId),
      orderBy: tickets.number,
    });
    return rows.map((row) => toTicket(row, currency));
  }

  async findByNumbers(raffleId: string, numbers: readonly number[]): Promise<Ticket[]> {
    if (numbers.length === 0) return [];

    const currency = await this.currencyOf(raffleId);
    const rows = await this.db.query.tickets.findMany({
      where: and(eq(tickets.raffleId, raffleId), inArray(tickets.number, [...numbers])),
      orderBy: tickets.number,
    });
    return rows.map((row) => toTicket(row, currency));
  }

  async save(ticket: Ticket): Promise<void> {
    const snapshot = ticket.toSnapshot();
    await this.db
      .update(tickets)
      .set({
        customerId: snapshot.customerId,
        status: snapshot.status,
        amountPaidCents: snapshot.amountPaidMinorUnits,
        notes: snapshot.notes,
        paidAt: snapshot.paidAt,
        updatedAt: new Date(),
      })
      .where(eq(tickets.id, snapshot.id));
  }

  async delete(ticketId: string): Promise<void> {
    await this.db.delete(tickets).where(eq(tickets.id, ticketId));
  }

  /** Tickets store amounts, the raffle owns the currency they are expressed in. */
  private async currencyOf(raffleId: string): Promise<string> {
    const row = await this.db.query.raffles.findFirst({
      where: eq(raffles.id, raffleId),
      columns: { currency: true },
    });
    return row?.currency ?? 'COP';
  }
}
