import { RaffleNotFoundError } from '../../domain/errors/raffle-errors.js';
import type { RaffleRepository } from '../../domain/ports/raffle-repository.js';

/**
 * Removes a closed raffle from the history, with its tickets and its audit
 * trail. Customers survive: they belong to the organizer, not to the raffle.
 */
export class DeleteRaffle {
  constructor(private readonly raffles: RaffleRepository) {}

  async execute(input: { actorId: string; raffleId: string }): Promise<void> {
    const raffle = await this.raffles.findById(input.raffleId);
    if (raffle === null) throw new RaffleNotFoundError(input.raffleId);
    raffle.ensureOwnedBy(input.actorId);
    raffle.ensureCanBeDeleted();

    await this.raffles.delete(raffle.id);
  }
}
