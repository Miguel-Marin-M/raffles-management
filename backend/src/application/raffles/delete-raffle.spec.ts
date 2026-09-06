import { beforeEach, describe, expect, it } from 'vitest';

import { Prize } from '../../domain/entities/prize.js';
import { Raffle } from '../../domain/entities/raffle.js';
import {
  ClosedRaffleIsFinalError,
  MissingPrizeWinnersError,
  RaffleAccessDeniedError,
  RaffleNotClosedError,
} from '../../domain/errors/raffle-errors.js';
import { Money } from '../../domain/value-objects/money.js';
import { NumberRange } from '../../domain/value-objects/number-range.js';
import { InMemoryDatabase } from '../../testing/in-memory/in-memory-database.js';
import { InMemoryUnitOfWork } from '../../testing/in-memory/in-memory-unit-of-work.js';
import { ChangeRaffleStatus } from './change-raffle-status.js';
import { DeleteRaffle } from './delete-raffle.js';
import { RecordPrizeWinners } from './record-prize-winners.js';

const OWNER_ID = 'owner-1';
const RAFFLE_ID = 'raffle-1';

describe('closing and deleting a raffle', () => {
  let db: InMemoryDatabase;
  let unitOfWork: InMemoryUnitOfWork;
  let changeStatus: ChangeRaffleStatus;
  let deleteRaffle: DeleteRaffle;
  let recordWinners: RecordPrizeWinners;

  beforeEach(async () => {
    db = new InMemoryDatabase();
    unitOfWork = new InMemoryUnitOfWork(db);
    changeStatus = new ChangeRaffleStatus(unitOfWork.repositories.raffles);
    deleteRaffle = new DeleteRaffle(unitOfWork.repositories.raffles);
    recordWinners = new RecordPrizeWinners(
      unitOfWork.repositories.raffles,
      unitOfWork.repositories.tickets,
    );

    await unitOfWork.repositories.raffles.save(
      Raffle.create({
        id: RAFFLE_ID,
        ownerId: OWNER_ID,
        name: 'Rifa de la moto',
        ticketPrice: Money.fromMinorUnits(10_000),
        range: NumberRange.twoDigits(),
        createdAt: new Date('2026-03-10T10:00:00Z'),
        status: 'active',
        prizes: [Prize.create({ id: 'prize-1', position: 1, title: 'Moto' })],
      }),
    );
  });

  async function recordWinner(): Promise<void> {
    await recordWinners.execute({
      actorId: OWNER_ID,
      raffleId: RAFFLE_ID,
      winners: [{ prizeId: 'prize-1', number: 47 }],
    });
  }

  function close() {
    return changeStatus.execute({ actorId: OWNER_ID, raffleId: RAFFLE_ID, status: 'closed' });
  }

  it('refuses to close a raffle whose prizes have no winning number', async () => {
    await expect(close()).rejects.toThrow(MissingPrizeWinnersError);
    expect(db.raffles.get(RAFFLE_ID)?.status).toBe('active');
  });

  it('closes an open raffle once the draw is written down', async () => {
    await recordWinner();

    expect((await close()).status).toBe('closed');
  });

  it('refuses to reopen a closed raffle', async () => {
    await recordWinner();
    await close();

    await expect(
      changeStatus.execute({ actorId: OWNER_ID, raffleId: RAFFLE_ID, status: 'active' }),
    ).rejects.toThrow(ClosedRaffleIsFinalError);
    expect(db.raffles.get(RAFFLE_ID)?.status).toBe('closed');
  });

  it('refuses to delete a raffle that is still open', async () => {
    await expect(
      deleteRaffle.execute({ actorId: OWNER_ID, raffleId: RAFFLE_ID }),
    ).rejects.toThrow(RaffleNotClosedError);
    expect(db.raffles.size).toBe(1);
  });

  it('deletes a raffle from the history', async () => {
    await recordWinner();
    await close();
    await deleteRaffle.execute({ actorId: OWNER_ID, raffleId: RAFFLE_ID });

    expect(db.raffles.size).toBe(0);
  });

  it('refuses to delete a raffle of another organizer', async () => {
    await recordWinner();
    await close();

    await expect(
      deleteRaffle.execute({ actorId: 'someone-else', raffleId: RAFFLE_ID }),
    ).rejects.toThrow(RaffleAccessDeniedError);
    expect(db.raffles.size).toBe(1);
  });
});
