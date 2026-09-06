import { RaffleNotFoundError } from '../../domain/errors/raffle-errors.js';
import type { RaffleRepository } from '../../domain/ports/raffle-repository.js';
import type { TicketRepository } from '../../domain/ports/ticket-repository.js';
import { toRaffleView, type RaffleView } from './raffle-view.js';

export interface PrizeWinnerInput {
  readonly prizeId: string;
  /** Null clears a number recorded by mistake. */
  readonly number: number | null;
}

export interface RecordPrizeWinnersCommand {
  readonly actorId: string;
  readonly raffleId: string;
  readonly winners: readonly PrizeWinnerInput[];
}

export interface RecordPrizeWinnersResult {
  readonly raffle: RaffleView;
  /** Who held each winning number, when it had been sold. */
  readonly winnerCustomerIds: Readonly<Record<string, string | null>>;
}

/**
 * Writes down the numbers that won after the draw.
 *
 * Takes a list because a lottery often decides several prizes at once: the
 * same number can win all of them, or each prize can have its own.
 *
 * Winners are looked up rather than stored with the prize: the ticket already
 * knows who holds the number, and duplicating it here would let the two
 * disagree if the boleta changes hands.
 */
export class RecordPrizeWinners {
  constructor(
    private readonly raffles: RaffleRepository,
    private readonly tickets: TicketRepository,
  ) {}

  async execute(command: RecordPrizeWinnersCommand): Promise<RecordPrizeWinnersResult> {
    const raffle = await this.raffles.findById(command.raffleId);
    if (raffle === null) throw new RaffleNotFoundError(command.raffleId);
    raffle.ensureOwnedBy(command.actorId);

    for (const winner of command.winners) {
      raffle.recordWinner(winner.prizeId, winner.number);
    }
    await this.raffles.save(raffle);

    const numbers = [
      ...new Set(
        command.winners
          .map((winner) => winner.number)
          .filter((number): number is number => number !== null),
      ),
    ];
    const tickets =
      numbers.length === 0 ? [] : await this.tickets.findByNumbers(raffle.id, numbers);
    const holders = new Map(tickets.map((ticket) => [ticket.number, ticket.customerId]));

    const winnerCustomerIds: Record<string, string | null> = {};
    for (const winner of command.winners) {
      winnerCustomerIds[winner.prizeId] =
        winner.number === null ? null : (holders.get(winner.number) ?? null);
    }

    return { raffle: toRaffleView(raffle), winnerCustomerIds };
  }
}
