import { RaffleNotFoundError } from '../../domain/errors/raffle-errors.js';
import {
  TicketHasPaymentsError,
  TicketNumbersNotReservedError,
} from '../../domain/errors/ticket-errors.js';
import type { TicketEvent } from '../../domain/ports/ticket-event-recorder.js';
import type { UnitOfWork } from '../../domain/ports/unit-of-work.js';

export interface ReleaseTicketsCommand {
  readonly actorId: string;
  readonly raffleId: string;
  readonly numbers: readonly number[];
  readonly reason?: string | null;
}

export interface ReleaseTicketsResult {
  readonly releasedNumbers: readonly number[];
}

/**
 * Puts numbers back on the market when a customer backs out.
 *
 * The ticket row is deleted rather than flagged, which is what makes the
 * number free again for the unique constraint; the audit trail keeps the
 * record of who released it.
 */
export class ReleaseTickets {
  constructor(private readonly unitOfWork: UnitOfWork) {}

  async execute(command: ReleaseTicketsCommand): Promise<ReleaseTicketsResult> {
    return this.unitOfWork.execute(async (repositories) => {
      const raffle = await repositories.raffles.findById(command.raffleId);
      if (raffle === null) throw new RaffleNotFoundError(command.raffleId);
      raffle.ensureOwnedBy(command.actorId);
      raffle.ensureAcceptsTicketChanges();

      const numbers = raffle.normalizeSelection(command.numbers);
      const tickets = await repositories.tickets.findByNumbers(raffle.id, numbers);

      const found = new Set(tickets.map((ticket) => ticket.number));
      const missing = numbers.filter((number) => !found.has(number));
      if (missing.length > 0) throw new TicketNumbersNotReservedError(missing);

      // Money already collected has to be refunded and recorded deliberately,
      // so releasing such a ticket is refused instead of silently dropping it.
      const withPayments = tickets
        .filter((ticket) => !ticket.amountPaid.isZero())
        .map((ticket) => ticket.number);
      if (withPayments.length > 0) throw new TicketHasPaymentsError(withPayments);

      const events: TicketEvent[] = [];
      for (const ticket of tickets) {
        await repositories.tickets.delete(ticket.id);
        events.push({
          raffleId: raffle.id,
          number: ticket.number,
          type: 'released',
          actorId: command.actorId,
          payload: {
            ticketId: ticket.id,
            customerId: ticket.customerId,
            reason: command.reason ?? null,
          },
        });
      }
      await repositories.ticketEvents.record(events);

      return { releasedNumbers: numbers };
    });
  }
}
