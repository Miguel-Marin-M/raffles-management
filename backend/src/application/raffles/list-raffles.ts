import type { RaffleRepository } from '../../domain/ports/raffle-repository.js';
import { toRaffleView, type RaffleView } from './raffle-view.js';

/** Lists the raffles of one organizer, newest first. */
export class ListRaffles {
  constructor(private readonly raffles: RaffleRepository) {}

  async execute(input: { actorId: string }): Promise<RaffleView[]> {
    const raffles = await this.raffles.findAllByOwner(input.actorId);
    return raffles.map((raffle) => toRaffleView(raffle));
  }
}
