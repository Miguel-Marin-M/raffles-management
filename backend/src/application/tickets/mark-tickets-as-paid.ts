import { Payment, type PaymentMethod } from '../../domain/entities/payment.js';
import { RaffleNotFoundError } from '../../domain/errors/raffle-errors.js';
import { TicketNumbersNotReservedError } from '../../domain/errors/ticket-errors.js';
import type { Clock } from '../../domain/ports/clock.js';
import type { IdGenerator } from '../../domain/ports/id-generator.js';
import type { TicketEvent } from '../../domain/ports/ticket-event-recorder.js';
import type { UnitOfWork } from '../../domain/ports/unit-of-work.js';
import { Money } from '../../domain/value-objects/money.js';

export interface MarkTicketsAsPaidCommand {
  readonly actorId: string;
  readonly raffleId: string;
  readonly numbers: readonly number[];
  readonly method?: PaymentMethod;
  readonly note?: string | null;
}

export interface MarkTicketsAsPaidResult {
  readonly paidNumbers: readonly number[];
  readonly collectedMinorUnits: number;
  readonly currency: string;
}

/**
 * Settles the outstanding balance of the selected numbers in one go, which is
 * what the board does when the organizer marks a selection as paid.
 *
 * Numbers that were already paid are left untouched instead of failing, so
 * repeating the action after a flaky connection is harmless.
 */
export class MarkTicketsAsPaid {
  constructor(
    private readonly unitOfWork: UnitOfWork,
    private readonly idGenerator: IdGenerator,
    private readonly clock: Clock,
  ) {}

  async execute(command: MarkTicketsAsPaidCommand): Promise<MarkTicketsAsPaidResult> {
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

      const paidAt = this.clock.now();
      const events: TicketEvent[] = [];
      const paidNumbers: number[] = [];
      let collected = Money.zero(raffle.currency);

      for (const ticket of tickets) {
        if (ticket.isPaid()) continue;

        const settled = ticket.settle(raffle.ticketPrice, paidAt);
        collected = collected.add(settled);
        paidNumbers.push(ticket.number);

        await repositories.payments.add(
          Payment.create({
            id: this.idGenerator.generate(),
            ticketId: ticket.id,
            amount: settled,
            paidAt,
            method: command.method ?? 'cash',
            note: command.note ?? null,
            createdBy: command.actorId,
          }),
        );
        await repositories.tickets.save(ticket);

        events.push({
          raffleId: raffle.id,
          number: ticket.number,
          type: 'paid',
          actorId: command.actorId,
          payload: { ticketId: ticket.id, amountMinorUnits: settled.minorUnits },
        });
      }

      await repositories.ticketEvents.record(events);

      return {
        paidNumbers,
        collectedMinorUnits: collected.minorUnits,
        currency: collected.currency,
      };
    });
  }
}
