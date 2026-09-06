import { RaffleNotFoundError } from '../../domain/errors/raffle-errors.js';
import type { RaffleRepository } from '../../domain/ports/raffle-repository.js';
import type { TicketRepository } from '../../domain/ports/ticket-repository.js';
import { toRaffleView, type RaffleView } from './raffle-view.js';

export interface RecordPrizeWinnerCommand {
  readonly actorId: string;
  readonly raffleId: string;
  readonly prizeId: string;
  /** Null clears a number recorded by mistake. */
  readonly number: number | null;
}

export interface RecordPrizeWinnerResult {
  readonly raffle: RaffleView;
  /** Who held the winning number, when it had been sold. */
  readonly winnerCustomerId: string | null;
}

/**
 * Writes down the number that won a prize after the draw.
 *
 * The winner is looked up rather than stored: the ticket already knows who
 * holds the number, and duplicating it here would let the two disagree if the
 * boleta is handed over.
 */
export class RecordPrizeWinner {
  constructor(
    private readonly raffles: RaffleRepository,
    private readonly tickets: TicketRepository,
  ) {}

  async execute(command: RecordPrizeWinnerCommand): Promise<RecordPrizeWinnerResult> {
    const raffle = await this.raffles.findById(command.raffleId);
    if (raffle === null) throw new RaffleNotFoundError(command.raffleId);
    raffle.ensureOwnedBy(command.actorId);

    raffle.recordWinner(command.prizeId, command.number);
    await this.raffles.save(raffle);

    if (command.number === null) return { raffle: toRaffleView(raffle), winnerCustomerId: null };

    const [ticket] = await this.tickets.findByNumbers(raffle.id, [command.number]);
    return {
      raffle: toRaffleView(raffle),
      winnerCustomerId: ticket?.customerId ?? null,
    };
  }
}
