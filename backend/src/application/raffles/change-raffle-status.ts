import type { RaffleStatus } from '../../domain/entities/raffle.js';
import { RaffleNotFoundError } from '../../domain/errors/raffle-errors.js';
import type { RaffleRepository } from '../../domain/ports/raffle-repository.js';
import { toRaffleView, type RaffleView } from './raffle-view.js';

/**
 * Publishes, closes or reopens a raffle.
 *
 * A closed raffle keeps its board readable as a record of what was sold, so
 * closing is a status change and never a deletion.
 */
export class ChangeRaffleStatus {
  constructor(private readonly raffles: RaffleRepository) {}

  async execute(input: {
    actorId: string;
    raffleId: string;
    status: RaffleStatus;
  }): Promise<RaffleView> {
    const raffle = await this.raffles.findById(input.raffleId);
    if (raffle === null) throw new RaffleNotFoundError(input.raffleId);
    raffle.ensureOwnedBy(input.actorId);

    raffle.changeStatus(input.status);
    await this.raffles.save(raffle);
    return toRaffleView(raffle);
  }
}
