import { Ticket } from '../../domain/entities/ticket.js';
import { RaffleNotFoundError } from '../../domain/errors/raffle-errors.js';
import { TicketsAlreadyTakenError } from '../../domain/errors/ticket-errors.js';
import type { Clock } from '../../domain/ports/clock.js';
import type { IdGenerator } from '../../domain/ports/id-generator.js';
import type { TicketEvent } from '../../domain/ports/ticket-event-recorder.js';
import type { UnitOfWork } from '../../domain/ports/unit-of-work.js';
import type { CustomerInput, CustomerResolver } from '../customers/customer-resolver.js';

export interface ReserveTicketsCommand {
  readonly actorId: string;
  readonly raffleId: string;
  readonly numbers: readonly number[];
  readonly customer: CustomerInput;
  readonly notes?: string | null;
}

export interface ReserveTicketsResult {
  readonly customerId: string;
  readonly numbers: readonly number[];
  readonly totalMinorUnits: number;
  readonly currency: string;
}

/**
 * Reserves a set of numbers for one customer.
 *
 * The reservation is all-or-nothing: if any number was taken between reading
 * the board and writing, nothing is stored and every conflicting number is
 * reported, so the organizer never ends up charging a total that does not
 * match what was actually reserved.
 */
export class ReserveTickets {
  constructor(
    private readonly unitOfWork: UnitOfWork,
    private readonly customerResolver: CustomerResolver,
    private readonly idGenerator: IdGenerator,
    private readonly clock: Clock,
  ) {}

  async execute(command: ReserveTicketsCommand): Promise<ReserveTicketsResult> {
    return this.unitOfWork.execute(async (repositories) => {
      const raffle = await repositories.raffles.findById(command.raffleId);
      if (raffle === null) throw new RaffleNotFoundError(command.raffleId);
      raffle.ensureOwnedBy(command.actorId);
      raffle.ensureAcceptsTicketChanges();

      const numbers = raffle.normalizeSelection(command.numbers);
      const customer = await this.customerResolver.resolve(
        repositories.customers,
        command.actorId,
        command.customer,
      );

      const reservedAt = this.clock.now();
      const tickets = numbers.map((number) =>
        Ticket.reserve({
          id: this.idGenerator.generate(),
          raffleId: raffle.id,
          number,
          customerId: customer.id,
          currency: raffle.currency,
          reservedAt,
          createdBy: command.actorId,
          notes: command.notes ?? null,
        }),
      );

      const outcome = await repositories.tickets.reserveIfAvailable(tickets);
      if (outcome.alreadyTaken.length > 0) {
        throw new TicketsAlreadyTakenError([...outcome.alreadyTaken].sort((a, b) => a - b));
      }

      const events: TicketEvent[] = outcome.reserved.map((ticket) => ({
        raffleId: raffle.id,
        number: ticket.number,
        type: 'reserved',
        actorId: command.actorId,
        payload: { ticketId: ticket.id, customerId: customer.id },
      }));
      await repositories.ticketEvents.record(events);

      const total = raffle.priceFor(numbers.length);
      return {
        customerId: customer.id,
        numbers,
        totalMinorUnits: total.minorUnits,
        currency: total.currency,
      };
    });
  }
}
