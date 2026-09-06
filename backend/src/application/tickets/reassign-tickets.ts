import { RaffleNotFoundError } from '../../domain/errors/raffle-errors.js';
import { TicketNumbersNotReservedError } from '../../domain/errors/ticket-errors.js';
import type { TicketEvent } from '../../domain/ports/ticket-event-recorder.js';
import type { UnitOfWork } from '../../domain/ports/unit-of-work.js';
import type { CustomerInput, CustomerResolver } from '../customers/customer-resolver.js';

export interface ReassignTicketsCommand {
  readonly actorId: string;
  readonly raffleId: string;
  readonly numbers: readonly number[];
  readonly customer: CustomerInput;
}

export interface ReassignTicketsResult {
  readonly customerId: string;
  readonly numbers: readonly number[];
}

/**
 * Hands reserved numbers over to another customer.
 *
 * Reassigning keeps the tickets, and with them whatever has been paid, so this
 * is the safe way to correct a name: releasing and reserving again would open a
 * window for somebody else to take the number.
 */
export class ReassignTickets {
  constructor(
    private readonly unitOfWork: UnitOfWork,
    private readonly customerResolver: CustomerResolver,
  ) {}

  async execute(command: ReassignTicketsCommand): Promise<ReassignTicketsResult> {
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

      const customer = await this.customerResolver.resolve(
        repositories.customers,
        command.actorId,
        command.customer,
      );

      const events: TicketEvent[] = [];
      for (const ticket of tickets) {
        const previousCustomerId = ticket.customerId;
        // Refuses paid tickets, which would lose the record of who paid.
        ticket.reassignTo(customer.id);
        await repositories.tickets.save(ticket);

        events.push({
          raffleId: raffle.id,
          number: ticket.number,
          type: 'reassigned',
          actorId: command.actorId,
          payload: { ticketId: ticket.id, from: previousCustomerId, to: customer.id },
        });
      }
      await repositories.ticketEvents.record(events);

      return { customerId: customer.id, numbers };
    });
  }
}
