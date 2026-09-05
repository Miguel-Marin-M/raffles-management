import type { Raffle } from '../entities/raffle.js';

export interface RaffleRepository {
  findById(raffleId: string): Promise<Raffle | null>;
  findAllByOwner(ownerId: string): Promise<Raffle[]>;
  /** Inserts or updates the raffle together with its prize list. */
  save(raffle: Raffle): Promise<void>;
  delete(raffleId: string): Promise<void>;
}

export const RAFFLE_REPOSITORY = Symbol('RaffleRepository');
