import { beforeEach, describe, expect, it } from 'vitest';

import { Prize } from '../../domain/entities/prize.js';
import { Raffle } from '../../domain/entities/raffle.js';
import { Ticket } from '../../domain/entities/ticket.js';
import { PrizeListError } from '../../domain/errors/raffle-errors.js';
import { TicketNumbersOutOfRangeError } from '../../domain/errors/ticket-errors.js';
import { Money } from '../../domain/value-objects/money.js';
import { NumberRange } from '../../domain/value-objects/number-range.js';
import { InMemoryDatabase } from '../../testing/in-memory/in-memory-database.js';
import { InMemoryUnitOfWork } from '../../testing/in-memory/in-memory-unit-of-work.js';
import { SequentialIdGenerator } from '../../testing/sequential-id-generator.js';
import { RecordPrizeWinners } from './record-prize-winners.js';
import { UpdateRaffle } from './update-raffle.js';

const OWNER_ID = 'owner-1';
const RAFFLE_ID = 'raffle-1';
const CREATED_AT = new Date('2026-03-09T10:00:00Z');

describe('RecordPrizeWinners', () => {
  let unitOfWork: InMemoryUnitOfWork;
  let recordWinner: RecordPrizeWinners;
  let updateRaffle: UpdateRaffle;

  beforeEach(async () => {
    unitOfWork = new InMemoryUnitOfWork(new InMemoryDatabase());
    recordWinner = new RecordPrizeWinners(
      unitOfWork.repositories.raffles,
      unitOfWork.repositories.tickets,
    );
    updateRaffle = new UpdateRaffle(
      unitOfWork.repositories.raffles,
      new SequentialIdGenerator('prize'),
    );

    await unitOfWork.repositories.raffles.save(
      Raffle.create({
        id: RAFFLE_ID,
        ownerId: OWNER_ID,
        name: 'Rifa de la moto',
        ticketPrice: Money.fromMinorUnits(10_000),
        range: NumberRange.twoDigits(),
        createdAt: CREATED_AT,
        status: 'active',
        prizes: [
          Prize.create({ id: 'prize-1', position: 1, title: 'Moto' }),
          Prize.create({ id: 'prize-2', position: 2, title: 'Televisor' }),
        ],
      }),
    );
  });

  it('writes the drawn number on the prize', async () => {
    const result = await recordWinner.execute({
      actorId: OWNER_ID,
      raffleId: RAFFLE_ID,
      winners: [{ prizeId: 'prize-1', number: 47 }],
    });

    expect(result.raffle.prizes[0]?.winningNumber).toBe(47);
    expect(result.raffle.prizes[1]?.winningNumber).toBeNull();
  });

  it('reports who held the winning number', async () => {
    await unitOfWork.repositories.tickets.save(
      Ticket.reserve({
        id: 'ticket-1',
        raffleId: RAFFLE_ID,
        number: 47,
        customerId: 'customer-1',
        currency: 'COP',
        reservedAt: CREATED_AT,
      }),
    );

    const result = await recordWinner.execute({
      actorId: OWNER_ID,
      raffleId: RAFFLE_ID,
      winners: [{ prizeId: 'prize-1', number: 47 }],
    });

    expect(result.winnerCustomerIds['prize-1']).toBe('customer-1');
  });

  it('accepts a number nobody bought', async () => {
    const result = await recordWinner.execute({
      actorId: OWNER_ID,
      raffleId: RAFFLE_ID,
      winners: [{ prizeId: 'prize-1', number: 47 }],
    });

    expect(result.winnerCustomerIds['prize-1']).toBeNull();
  });

  it('clears a number recorded by mistake', async () => {
    await recordWinner.execute({
      actorId: OWNER_ID,
      raffleId: RAFFLE_ID,
      winners: [{ prizeId: 'prize-1', number: 47 }],
    });

    const result = await recordWinner.execute({
      actorId: OWNER_ID,
      raffleId: RAFFLE_ID,
      winners: [{ prizeId: 'prize-1', number: null }],
    });

    expect(result.raffle.prizes[0]?.winningNumber).toBeNull();
  });

  it('rejects a number outside the raffle range', async () => {
    await expect(
      recordWinner.execute({
        actorId: OWNER_ID,
        raffleId: RAFFLE_ID,
        winners: [{ prizeId: 'prize-1', number: 250 }],
      }),
    ).rejects.toThrow(TicketNumbersOutOfRangeError);
  });

  it('rejects a prize from another raffle', async () => {
    await expect(
      recordWinner.execute({
        actorId: OWNER_ID,
        raffleId: RAFFLE_ID,
        winners: [{ prizeId: 'prize-ajeno', number: 12 }],
      }),
    ).rejects.toThrow(PrizeListError);
  });

  it('keeps the winners when the prize list is edited', async () => {
    await recordWinner.execute({
      actorId: OWNER_ID,
      raffleId: RAFFLE_ID,
      winners: [{ prizeId: 'prize-1', number: 47 }],
    });

    const updated = await updateRaffle.execute({
      actorId: OWNER_ID,
      raffleId: RAFFLE_ID,
      prizes: [{ title: 'Moto Bajaj Boxer' }, { title: 'Televisor' }],
    });

    expect(updated.prizes[0]?.title).toBe('Moto Bajaj Boxer');
    expect(updated.prizes[0]?.winningNumber).toBe(47);
  });
});
