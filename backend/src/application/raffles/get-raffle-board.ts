import type { TicketStatus } from '../../domain/entities/ticket.js';
import { RaffleNotFoundError } from '../../domain/errors/raffle-errors.js';
import type { CustomerRepository } from '../../domain/ports/customer-repository.js';
import type { RaffleRepository } from '../../domain/ports/raffle-repository.js';
import type { TicketRepository } from '../../domain/ports/ticket-repository.js';
import { Money } from '../../domain/value-objects/money.js';
import { toRaffleView, type RaffleView } from './raffle-view.js';

export interface BoardCell {
  readonly ticketId: string;
  readonly number: number;
  /** Zero-padded number as printed on the board. */
  readonly label: string;
  readonly status: TicketStatus;
  readonly customerId: string;
  readonly customerName: string;
  readonly amountPaidMinorUnits: number;
  readonly outstandingMinorUnits: number;
  readonly notes: string | null;
}

export interface BoardSummary {
  readonly totalNumbers: number;
  readonly freeNumbers: number;
  readonly reservedNumbers: number;
  readonly paidNumbers: number;
  readonly collectedMinorUnits: number;
  readonly pendingMinorUnits: number;
  readonly potentialMinorUnits: number;
}

export interface RaffleBoardView {
  readonly raffle: RaffleView;
  /** Only taken numbers travel: a free number is one that is not listed. */
  readonly takenCells: readonly BoardCell[];
  readonly summary: BoardSummary;
}

/**
 * Builds everything the board screen needs in a single read.
 *
 * Free numbers are not sent: the client already knows the range and renders
 * the grid from it, so a 1000-number raffle stays a small payload.
 */
export class GetRaffleBoard {
  constructor(
    private readonly raffles: RaffleRepository,
    private readonly tickets: TicketRepository,
    private readonly customers: CustomerRepository,
  ) {}

  async execute(input: { actorId: string; raffleId: string }): Promise<RaffleBoardView> {
    const raffle = await this.raffles.findById(input.raffleId);
    if (raffle === null) throw new RaffleNotFoundError(input.raffleId);
    raffle.ensureOwnedBy(input.actorId);

    const tickets = await this.tickets.findByRaffle(raffle.id);
    const customers = await this.customers.findManyByIds([
      ...new Set(tickets.map((ticket) => ticket.customerId)),
    ]);
    const names = new Map(customers.map((customer) => [customer.id, customer.name]));

    let collected = Money.zero(raffle.currency);
    let pending = Money.zero(raffle.currency);
    let paidNumbers = 0;

    const takenCells = tickets.map((ticket) => {
      const outstanding = ticket.outstanding(raffle.ticketPrice);
      collected = collected.add(ticket.amountPaid);
      pending = pending.add(outstanding);
      if (ticket.isPaid()) paidNumbers += 1;

      return {
        ticketId: ticket.id,
        number: ticket.number,
        label: raffle.range.format(ticket.number),
        status: ticket.status,
        customerId: ticket.customerId,
        customerName: names.get(ticket.customerId) ?? '',
        amountPaidMinorUnits: ticket.amountPaid.minorUnits,
        outstandingMinorUnits: outstanding.minorUnits,
        notes: ticket.notes,
      };
    });

    return {
      raffle: toRaffleView(raffle),
      takenCells,
      summary: {
        totalNumbers: raffle.range.size,
        freeNumbers: raffle.range.size - tickets.length,
        reservedNumbers: tickets.length - paidNumbers,
        paidNumbers,
        collectedMinorUnits: collected.minorUnits,
        pendingMinorUnits: pending.minorUnits,
        potentialMinorUnits: raffle.priceFor(raffle.range.size).minorUnits,
      },
    };
  }
}
