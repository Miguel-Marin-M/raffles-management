import { beforeEach, describe, expect, it } from 'vitest';

import { ValidationError } from '../../domain/errors/domain-error.js';
import { FixedClock } from '../../testing/fixed-clock.js';
import { InMemoryDatabase } from '../../testing/in-memory/in-memory-database.js';
import { InMemoryUnitOfWork } from '../../testing/in-memory/in-memory-unit-of-work.js';
import { SequentialIdGenerator } from '../../testing/sequential-id-generator.js';
import { CreateRaffle } from './create-raffle.js';

const OWNER_ID = 'owner-1';

describe('CreateRaffle', () => {
  let db: InMemoryDatabase;
  let createRaffle: CreateRaffle;

  beforeEach(() => {
    db = new InMemoryDatabase();
    const unitOfWork = new InMemoryUnitOfWork(db);
    createRaffle = new CreateRaffle(
      unitOfWork.repositories.raffles,
      new SequentialIdGenerator('raffle'),
      new FixedClock(new Date('2026-03-04T09:00:00Z')),
    );
  });

  function create(overrides: Partial<Parameters<CreateRaffle['execute']>[0]> = {}) {
    return createRaffle.execute({
      actorId: OWNER_ID,
      name: 'Rifa de la moto',
      ticketPriceMinorUnits: 10_000,
      ...overrides,
    });
  }

  it('defaults to the 00-99 board', async () => {
    const raffle = await create();

    expect(raffle.numberMin).toBe(0);
    expect(raffle.numberMax).toBe(99);
    expect(raffle.numberDigits).toBe(2);
    expect(raffle.ticketCount).toBe(100);
    expect(raffle.status).toBe('draft');
  });

  it('accepts a custom range', async () => {
    const raffle = await create({ numberMin: 0, numberMax: 999 });

    expect(raffle.numberDigits).toBe(3);
    expect(raffle.ticketCount).toBe(1_000);
  });

  it('numbers the prizes following the order they were added', async () => {
    const raffle = await create({
      prizes: [{ title: 'Moto' }, { title: 'Televisor' }, { title: 'Bono' }],
    });

    expect(raffle.prizes.map((prize) => [prize.position, prize.title])).toEqual([
      [1, 'Moto'],
      [2, 'Televisor'],
      [3, 'Bono'],
    ]);
  });

  it('rejects a free ticket', async () => {
    await expect(create({ ticketPriceMinorUnits: 0 })).rejects.toThrow(ValidationError);
  });

  it('stores the raffle under its owner', async () => {
    const created = await create();

    expect(db.raffles.get(created.id)?.ownerId).toBe(OWNER_ID);
  });
});
