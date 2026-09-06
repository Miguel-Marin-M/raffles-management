import { Payment, type PaymentMethod } from '../../domain/entities/payment.js';
import type { Ticket } from '../../domain/entities/ticket.js';
import { ValidationError } from '../../domain/errors/domain-error.js';
import { RaffleNotFoundError } from '../../domain/errors/raffle-errors.js';
import {
  PaymentExceedsOutstandingError,
  TicketNumbersNotReservedError,
} from '../../domain/errors/ticket-errors.js';
import type { Clock } from '../../domain/ports/clock.js';
import type { IdGenerator } from '../../domain/ports/id-generator.js';
import type { TicketEvent } from '../../domain/ports/ticket-event-recorder.js';
import type { UnitOfWork } from '../../domain/ports/unit-of-work.js';
import { Money } from '../../domain/value-objects/money.js';

export interface RegisterGroupPaymentCommand {
  readonly actorId: string;
  readonly raffleId: string;
  readonly numbers: readonly number[];
  readonly amountMinorUnits: number;
  readonly method?: PaymentMethod;
  readonly note?: string | null;
}

export interface RegisterGroupPaymentResult {
  readonly appliedMinorUnits: number;
  readonly paidNumbers: readonly number[];
  readonly outstandingMinorUnits: number;
  readonly currency: string;
}

/**
 * Splits an instalment evenly across the chosen numbers.
 *
 * A partial payment must not decide which boletas are settled: paying half of
 * five boletas does not mean two of them are in the draw. Spreading the money
 * evenly keeps every number equally short until the organizer settles specific
 * ones, and once the instalments add up to the whole debt every number is
 * covered at the same time.
 */
export class RegisterGroupPayment {
  constructor(
    private readonly unitOfWork: UnitOfWork,
    private readonly idGenerator: IdGenerator,
    private readonly clock: Clock,
  ) {}

  async execute(command: RegisterGroupPaymentCommand): Promise<RegisterGroupPaymentResult> {
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

      if (!Number.isSafeInteger(command.amountMinorUnits) || command.amountMinorUnits <= 0) {
        throw new ValidationError('El abono tiene que ser mayor que cero');
      }

      const outstanding = tickets.reduce(
        (total, ticket) => total + ticket.outstanding(raffle.ticketPrice).minorUnits,
        0,
      );
      if (command.amountMinorUnits > outstanding) {
        throw new PaymentExceedsOutstandingError(command.amountMinorUnits, outstanding);
      }

      const shares = splitEvenly(command.amountMinorUnits, tickets, raffle.ticketPrice);
      const paidAt = this.clock.now();
      const events: TicketEvent[] = [];
      const paidNumbers: number[] = [];

      for (const ticket of tickets) {
        const share = shares.get(ticket.number) ?? 0;
        if (share === 0) continue;

        const amount = Money.fromMinorUnits(share, raffle.currency);
        ticket.registerPayment(amount, raffle.ticketPrice, paidAt);

        await repositories.payments.add(
          Payment.create({
            id: this.idGenerator.generate(),
            ticketId: ticket.id,
            amount,
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
          type: 'payment_registered',
          actorId: command.actorId,
          payload: { ticketId: ticket.id, amountMinorUnits: share },
        });
        if (ticket.isPaid()) {
          paidNumbers.push(ticket.number);
          events.push({
            raffleId: raffle.id,
            number: ticket.number,
            type: 'paid',
            actorId: command.actorId,
            payload: { ticketId: ticket.id },
          });
        }
      }

      await repositories.ticketEvents.record(events);

      return {
        appliedMinorUnits: command.amountMinorUnits,
        paidNumbers,
        outstandingMinorUnits: outstanding - command.amountMinorUnits,
        currency: raffle.currency,
      };
    });
  }
}

/**
 * Hands out the amount in equal parts, capped by what each number still owes.
 *
 * Tickets that fill up early return their leftover to the next round, so an
 * uneven set of balances still ends up covered without anyone overpaying. The
 * indivisible remainder goes to the first numbers, a peso at a time.
 */
function splitEvenly(
  amountMinorUnits: number,
  tickets: readonly Ticket[],
  ticketPrice: Money,
): Map<number, number> {
  const shares = new Map<number, number>();
  const room = new Map<number, number>();
  for (const ticket of tickets) {
    room.set(ticket.number, ticket.outstanding(ticketPrice).minorUnits);
    shares.set(ticket.number, 0);
  }

  let remaining = amountMinorUnits;
  while (remaining > 0) {
    const open = tickets.filter((ticket) => (room.get(ticket.number) ?? 0) > 0);
    if (open.length === 0) break;

    const base = Math.floor(remaining / open.length);
    let leftover = remaining - base * open.length;
    let distributed = 0;

    for (const ticket of open) {
      const available = room.get(ticket.number) ?? 0;
      const extra = leftover > 0 ? 1 : 0;
      const share = Math.min(available, base + extra);
      leftover -= extra;

      shares.set(ticket.number, (shares.get(ticket.number) ?? 0) + share);
      room.set(ticket.number, available - share);
      distributed += share;
    }

    // Nothing could be placed: every open ticket is already full.
    if (distributed === 0) break;
    remaining -= distributed;
  }

  return shares;
}
