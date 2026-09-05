import { Prize } from '../../domain/entities/prize.js';
import { RaffleNotFoundError } from '../../domain/errors/raffle-errors.js';
import type { IdGenerator } from '../../domain/ports/id-generator.js';
import type { RaffleRepository } from '../../domain/ports/raffle-repository.js';
import { Money } from '../../domain/value-objects/money.js';
import type { PrizeInput } from './create-raffle.js';
import { toRaffleView, type RaffleView } from './raffle-view.js';

export interface UpdateRaffleCommand {
  readonly actorId: string;
  readonly raffleId: string;
  readonly name?: string;
  readonly description?: string | null;
  readonly ticketPriceMinorUnits?: number;
  readonly drawDate?: Date | null;
  readonly lotteryReference?: string | null;
  /** When present, replaces the whole prize list in the given order. */
  readonly prizes?: readonly PrizeInput[];
}

/**
 * Edits raffle details and, optionally, its prize list.
 *
 * The prize list is replaced wholesale rather than patched entry by entry,
 * which matches an editor where rows are added, reordered and removed before
 * saving once.
 */
export class UpdateRaffle {
  constructor(
    private readonly raffles: RaffleRepository,
    private readonly idGenerator: IdGenerator,
  ) {}

  async execute(command: UpdateRaffleCommand): Promise<RaffleView> {
    const raffle = await this.raffles.findById(command.raffleId);
    if (raffle === null) throw new RaffleNotFoundError(command.raffleId);
    raffle.ensureOwnedBy(command.actorId);

    raffle.updateDetails({
      ...(command.name !== undefined ? { name: command.name } : {}),
      ...(command.description !== undefined ? { description: command.description } : {}),
      ...(command.ticketPriceMinorUnits !== undefined
        ? {
            ticketPrice: Money.fromMinorUnits(command.ticketPriceMinorUnits, raffle.currency),
          }
        : {}),
      ...(command.drawDate !== undefined ? { drawDate: command.drawDate } : {}),
      ...(command.lotteryReference !== undefined
        ? { lotteryReference: command.lotteryReference }
        : {}),
    });

    if (command.prizes !== undefined) {
      raffle.replacePrizes(
        command.prizes.map((prize, index) =>
          Prize.create({
            id: this.idGenerator.generate(),
            position: index + 1,
            title: prize.title,
            description: prize.description ?? null,
          }),
        ),
      );
    }

    await this.raffles.save(raffle);
    return toRaffleView(raffle);
  }
}
