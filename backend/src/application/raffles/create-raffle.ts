import { Prize } from '../../domain/entities/prize.js';
import { Raffle, type RaffleStatus } from '../../domain/entities/raffle.js';
import type { Clock } from '../../domain/ports/clock.js';
import type { IdGenerator } from '../../domain/ports/id-generator.js';
import type { RaffleRepository } from '../../domain/ports/raffle-repository.js';
import { Money } from '../../domain/value-objects/money.js';
import { NumberRange } from '../../domain/value-objects/number-range.js';
import { toRaffleView, type RaffleView } from './raffle-view.js';

export interface PrizeInput {
  readonly title: string;
  readonly description?: string | null;
}

export interface CreateRaffleCommand {
  readonly actorId: string;
  readonly name: string;
  readonly ticketPriceMinorUnits: number;
  readonly description?: string | null;
  readonly currency?: string;
  readonly numberMin?: number;
  readonly numberMax?: number;
  readonly numberDigits?: number;
  readonly drawDate?: Date | null;
  readonly lotteryReference?: string | null;
  readonly prizes?: readonly PrizeInput[];
  readonly status?: RaffleStatus;
}

/**
 * Creates a raffle with its ticket price, number range and prize list.
 *
 * Prizes arrive as an ordered list, the way the "add another prize" form
 * produces them, and their position is derived from that order.
 */
export class CreateRaffle {
  constructor(
    private readonly raffles: RaffleRepository,
    private readonly idGenerator: IdGenerator,
    private readonly clock: Clock,
  ) {}

  async execute(command: CreateRaffleCommand): Promise<RaffleView> {
    const range = NumberRange.create(
      command.numberMin ?? 0,
      command.numberMax ?? 99,
      command.numberDigits,
    );

    const raffle = Raffle.create({
      id: this.idGenerator.generate(),
      ownerId: command.actorId,
      name: command.name,
      description: command.description ?? null,
      ticketPrice: Money.fromMinorUnits(command.ticketPriceMinorUnits, command.currency),
      range,
      drawDate: command.drawDate ?? null,
      lotteryReference: command.lotteryReference ?? null,
      status: command.status ?? 'draft',
      prizes: (command.prizes ?? []).map((prize, index) =>
        Prize.create({
          id: this.idGenerator.generate(),
          position: index + 1,
          title: prize.title,
          description: prize.description ?? null,
        }),
      ),
      createdAt: this.clock.now(),
    });

    await this.raffles.save(raffle);
    return toRaffleView(raffle);
  }
}
