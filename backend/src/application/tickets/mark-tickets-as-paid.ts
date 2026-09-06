import { Payment, type PaymentMethod } from '../../domain/entities/payment.js';
import type { Ticket } from '../../domain/entities/ticket.js';
import { RaffleNotFoundError } from '../../domain/errors/raffle-errors.js';
import { TicketNumbersNotReservedError } from '../../domain/errors/ticket-errors.js';
import type { Clock } from '../../domain/ports/clock.js';
import type { IdGenerator } from '../../domain/ports/id-generator.js';
import type { TicketEvent } from '../../domain/ports/ticket-event-recorder.js';
import type { Repositories, UnitOfWork } from '../../domain/ports/unit-of-work.js';
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
  /** New money received now. */
  readonly collectedMinorUnits: number;
  /** Instalments moved off the numbers the customer is not playing. */
  readonly appliedCreditMinorUnits: number;
  readonly currency: string;
}

/**
 * Settles the selected numbers: this is the moment the organizer decides which
 * boletas play.
 *
 * Instalments the customer had spread over their other numbers are pulled in
 * first, so the money follows the boletas that play and the ones left behind
 * go back to zero. Only what is still missing is charged as new money.
 *
 * Numbers already paid are left untouched instead of failing, so repeating the
 * action after a flaky connection is harmless.
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
      const selected = await repositories.tickets.findByNumbers(raffle.id, numbers);

      const found = new Set(selected.map((ticket) => ticket.number));
      const missing = numbers.filter((number) => !found.has(number));
      if (missing.length > 0) throw new TicketNumbersNotReservedError(missing);

      const pending = selected.filter((ticket) => !ticket.isPaid());
      const paidAt = this.clock.now();
      const events: TicketEvent[] = [];
      let collected = Money.zero(raffle.currency);
      let creditApplied = Money.zero(raffle.currency);

      for (const [customerId, tickets] of groupByCustomer(pending)) {
        let credit = await this.reclaimCredit({
          repositories,
          raffleId: raffle.id,
          customerId,
          keep: new Set(tickets.map((ticket) => ticket.number)),
          needed: tickets.reduce(
            (total, ticket) => total.add(ticket.outstanding(raffle.ticketPrice)),
            Money.zero(raffle.currency),
          ),
          actorId: command.actorId,
          events,
        });
        creditApplied = creditApplied.add(credit);

        for (const ticket of tickets) {
          const fromCredit = credit.isLessThan(ticket.outstanding(raffle.ticketPrice))
            ? credit
            : ticket.outstanding(raffle.ticketPrice);
          if (fromCredit.isPositive()) {
            ticket.registerPayment(fromCredit, raffle.ticketPrice, paidAt);
            credit = credit.subtract(fromCredit);
          }

          const cash = ticket.outstanding(raffle.ticketPrice);
          if (cash.isPositive()) {
            ticket.registerPayment(cash, raffle.ticketPrice, paidAt);
            collected = collected.add(cash);

            await repositories.payments.add(
              Payment.create({
                id: this.idGenerator.generate(),
                ticketId: ticket.id,
                amount: cash,
                paidAt,
                method: command.method ?? 'cash',
                note: command.note ?? null,
                createdBy: command.actorId,
              }),
            );
          }

          await repositories.tickets.save(ticket);
          events.push({
            raffleId: raffle.id,
            number: ticket.number,
            type: 'paid',
            actorId: command.actorId,
            payload: { ticketId: ticket.id, amountMinorUnits: cash.minorUnits },
          });
        }
      }

      await repositories.ticketEvents.record(events);

      return {
        paidNumbers: pending.map((ticket) => ticket.number),
        collectedMinorUnits: collected.minorUnits,
        appliedCreditMinorUnits: creditApplied.minorUnits,
        currency: raffle.currency,
      };
    });
  }

  /** Empties the customer's other numbers, taking only what the settlement needs. */
  private async reclaimCredit(input: {
    repositories: Repositories;
    raffleId: string;
    customerId: string;
    keep: ReadonlySet<number>;
    needed: Money;
    actorId: string;
    events: TicketEvent[];
  }): Promise<Money> {
    const currency = input.needed.currency;
    let credit = Money.zero(currency);
    if (!input.needed.isPositive()) return credit;

    const others = (await input.repositories.tickets.findByRaffle(input.raffleId)).filter(
      (ticket) =>
        ticket.customerId === input.customerId &&
        !ticket.isPaid() &&
        !input.keep.has(ticket.number) &&
        ticket.amountPaid.isPositive(),
    );

    for (const ticket of others) {
      const room = input.needed.subtract(credit);
      if (!room.isPositive()) break;

      const taken = ticket.amountPaid.isLessThan(room) ? ticket.amountPaid : room;
      ticket.withdrawCredit(taken);
      await input.repositories.tickets.save(ticket);
      credit = credit.add(taken);

      input.events.push({
        raffleId: input.raffleId,
        number: ticket.number,
        type: 'updated',
        actorId: input.actorId,
        payload: { ticketId: ticket.id, creditMovedMinorUnits: taken.minorUnits },
      });
    }

    return credit;
  }
}

function groupByCustomer(tickets: readonly Ticket[]): Map<string, Ticket[]> {
  const grouped = new Map<string, Ticket[]>();
  for (const ticket of tickets) {
    grouped.set(ticket.customerId, [...(grouped.get(ticket.customerId) ?? []), ticket]);
  }
  return grouped;
}
