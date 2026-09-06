import { desc, eq } from 'drizzle-orm';

import { Raffle } from '../../domain/entities/raffle.js';
import type { RaffleRepository } from '../../domain/ports/raffle-repository.js';
import { prizes, raffles } from '../database/schema/index.js';
import type { PrizeRow, RaffleRow } from '../database/schema/index.js';
import type { DrizzleExecutor } from './drizzle-executor.js';

function toRaffle(row: RaffleRow, prizeRows: readonly PrizeRow[]): Raffle {
  return Raffle.restore({
    id: row.id,
    ownerId: row.ownerId,
    name: row.name,
    description: row.description,
    ticketPriceMinorUnits: row.ticketPriceCents,
    currency: row.currency,
    numberMin: row.numberMin,
    numberMax: row.numberMax,
    numberDigits: row.numberDigits,
    drawDate: row.drawDate,
    lotteryReference: row.lotteryReference,
    status: row.status,
    prizes: prizeRows.map((prize) => ({
      id: prize.id,
      position: prize.position,
      title: prize.title,
      description: prize.description,
      winningNumber: prize.winningNumber,
    })),
    createdAt: row.createdAt,
  });
}

export class DrizzleRaffleRepository implements RaffleRepository {
  constructor(private readonly db: DrizzleExecutor) {}

  async findById(raffleId: string): Promise<Raffle | null> {
    const row = await this.db.query.raffles.findFirst({
      where: eq(raffles.id, raffleId),
      with: { prizes: true },
    });
    return row === undefined ? null : toRaffle(row, row.prizes);
  }

  async findAllByOwner(ownerId: string): Promise<Raffle[]> {
    const rows = await this.db.query.raffles.findMany({
      where: eq(raffles.ownerId, ownerId),
      with: { prizes: true },
      orderBy: desc(raffles.createdAt),
    });
    return rows.map((row) => toRaffle(row, row.prizes));
  }

  /**
   * Writes the raffle and its prize list.
   *
   * The prize list is rewritten rather than diffed: it is a short, ordered list
   * the organizer edits as a whole, and rewriting it keeps positions consistent
   * without a reconciliation pass.
   */
  async save(raffle: Raffle): Promise<void> {
    const snapshot = raffle.toSnapshot();
    const values = {
      id: snapshot.id,
      ownerId: snapshot.ownerId,
      name: snapshot.name,
      description: snapshot.description,
      ticketPriceCents: snapshot.ticketPriceMinorUnits,
      currency: snapshot.currency,
      numberMin: snapshot.numberMin,
      numberMax: snapshot.numberMax,
      numberDigits: snapshot.numberDigits,
      drawDate: snapshot.drawDate,
      lotteryReference: snapshot.lotteryReference,
      status: snapshot.status,
      createdAt: snapshot.createdAt,
      updatedAt: new Date(),
    };

    await this.db
      .insert(raffles)
      .values(values)
      .onConflictDoUpdate({ target: raffles.id, set: values });

    await this.db.delete(prizes).where(eq(prizes.raffleId, snapshot.id));
    if (snapshot.prizes.length > 0) {
      await this.db.insert(prizes).values(
        snapshot.prizes.map((prize) => ({
          id: prize.id,
          raffleId: snapshot.id,
          position: prize.position,
          title: prize.title,
          description: prize.description,
          winningNumber: prize.winningNumber,
        })),
      );
    }
  }

  async delete(raffleId: string): Promise<void> {
    await this.db.delete(raffles).where(eq(raffles.id, raffleId));
  }
}
