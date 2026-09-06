import { RaffleNotFoundError } from '../../domain/errors/raffle-errors.js';
import { TicketNotFoundError } from '../../domain/errors/ticket-errors.js';
import type { UnitOfWork } from '../../domain/ports/unit-of-work.js';
import type { CustomerInput, CustomerResolver } from '../customers/customer-resolver.js';

export interface ReassignTicketCommand {
  readonly actorId: string;
  readonly ticketId: string;
  readonly customer: CustomerInput;
}

export interface ReassignTicketResult {
  readonly ticketId: string;
  readonly number: number;
  readonly customerId: string;
}

/**
 * Hands a reserved number over to another customer.
 *
 * Reassigning keeps the ticket, and with it whatever has been paid, so this is
 * the safe way to correct a name without freeing the number for someone else
 * to take in between.
 */
export class ReassignTicket {
  constructor(
    private readonly unitOfWork: UnitOfWork,
    private readonly customerResolver: CustomerResolver,
  ) {}

  async execute(command: ReassignTicketCommand): Promise<ReassignTicketResult> {
    return this.unitOfWork.execute(async (repositories) => {
      const ticket = await repositories.tickets.findById(command.ticketId);
      if (ticket === null) throw new TicketNotFoundError(command.ticketId);

      const raffle = await repositories.raffles.findById(ticket.raffleId);
      if (raffle === null) throw new RaffleNotFoundError(ticket.raffleId);
      raffle.ensureOwnedBy(command.actorId);
      raffle.ensureAcceptsTicketChanges();

      const previousCustomerId = ticket.customerId;
      const customer = await this.customerResolver.resolve(
        repositories.customers,
        command.actorId,
        command.customer,
      );

      ticket.reassignTo(customer.id);
      await repositories.tickets.save(ticket);

      await repositories.ticketEvents.record([
        {
          raffleId: raffle.id,
          number: ticket.number,
          type: 'reassigned',
          actorId: command.actorId,
          payload: { ticketId: ticket.id, from: previousCustomerId, to: customer.id },
        },
      ]);

      return { ticketId: ticket.id, number: ticket.number, customerId: customer.id };
    });
  }
}
