import { Payment, type PaymentMethod } from '../../domain/entities/payment.js';
import { RaffleNotFoundError } from '../../domain/errors/raffle-errors.js';
import { TicketNotFoundError } from '../../domain/errors/ticket-errors.js';
import type { Clock } from '../../domain/ports/clock.js';
import type { IdGenerator } from '../../domain/ports/id-generator.js';
import type { TicketEvent } from '../../domain/ports/ticket-event-recorder.js';
import type { UnitOfWork } from '../../domain/ports/unit-of-work.js';
import { Money } from '../../domain/value-objects/money.js';

export interface RegisterPaymentCommand {
  readonly actorId: string;
  readonly ticketId: string;
  readonly amountMinorUnits: number;
  readonly method?: PaymentMethod;
  readonly note?: string | null;
}

export interface RegisterPaymentResult {
  readonly ticketId: string;
  readonly status: 'reserved' | 'paid';
  readonly amountPaidMinorUnits: number;
  readonly outstandingMinorUnits: number;
}

/**
 * Records a payment against one ticket, in full or as an instalment.
 *
 * The payment row and the ticket balance are written together so the audited
 * history and the board can never disagree.
 */
export class RegisterPayment {
  constructor(
    private readonly unitOfWork: UnitOfWork,
    private readonly idGenerator: IdGenerator,
    private readonly clock: Clock,
  ) {}

  async execute(command: RegisterPaymentCommand): Promise<RegisterPaymentResult> {
    return this.unitOfWork.execute(async (repositories) => {
      const ticket = await repositories.tickets.findById(command.ticketId);
      if (ticket === null) throw new TicketNotFoundError(command.ticketId);

      const raffle = await repositories.raffles.findById(ticket.raffleId);
      if (raffle === null) throw new RaffleNotFoundError(ticket.raffleId);
      raffle.ensureOwnedBy(command.actorId);
      raffle.ensureAcceptsTicketChanges();

      const amount = Money.fromMinorUnits(command.amountMinorUnits, raffle.currency);
      const paidAt = this.clock.now();
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

      const events: TicketEvent[] = [
        {
          raffleId: raffle.id,
          number: ticket.number,
          type: 'payment_registered',
          actorId: command.actorId,
          payload: { ticketId: ticket.id, amountMinorUnits: amount.minorUnits },
        },
      ];
      if (ticket.isPaid()) {
        events.push({
          raffleId: raffle.id,
          number: ticket.number,
          type: 'paid',
          actorId: command.actorId,
          payload: { ticketId: ticket.id },
        });
      }
      await repositories.ticketEvents.record(events);

      return {
        ticketId: ticket.id,
        status: ticket.status,
        amountPaidMinorUnits: ticket.amountPaid.minorUnits,
        outstandingMinorUnits: ticket.outstanding(raffle.ticketPrice).minorUnits,
      };
    });
  }
}
