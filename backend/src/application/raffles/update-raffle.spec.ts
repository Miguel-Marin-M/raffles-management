import { beforeEach, describe, expect, it } from 'vitest';

import { RaffleAccessDeniedError, RaffleNotFoundError } from '../../domain/errors/raffle-errors.js';
import { FixedClock } from '../../testing/fixed-clock.js';
import { InMemoryDatabase } from '../../testing/in-memory/in-memory-database.js';
import { InMemoryUnitOfWork } from '../../testing/in-memory/in-memory-unit-of-work.js';
import { SequentialIdGenerator } from '../../testing/sequential-id-generator.js';
import { CreateRaffle } from './create-raffle.js';
import type { RaffleView } from './raffle-view.js';
import { UpdateRaffle } from './update-raffle.js';

const OWNER_ID = 'owner-1';

describe('UpdateRaffle', () => {
  let createRaffle: CreateRaffle;
  let updateRaffle: UpdateRaffle;

  beforeEach(() => {
    const unitOfWork = new InMemoryUnitOfWork(new InMemoryDatabase());
    const idGenerator = new SequentialIdGenerator('raffle');

    createRaffle = new CreateRaffle(
      unitOfWork.repositories.raffles,
      idGenerator,
      new FixedClock(new Date('2026-03-04T09:00:00Z')),
    );
    updateRaffle = new UpdateRaffle(unitOfWork.repositories.raffles, idGenerator);
  });

  function create(overrides: Partial<Parameters<CreateRaffle['execute']>[0]> = {}): Promise<RaffleView> {
    return createRaffle.execute({
      actorId: OWNER_ID,
      name: 'Rifa de la moto',
      ticketPriceMinorUnits: 10_000,
      ...overrides,
    });
  }

  it('leaves untouched fields alone', async () => {
    const created = await create({ description: 'Sorteo de fin de año' });

    const updated = await updateRaffle.execute({
      actorId: OWNER_ID,
      raffleId: created.id,
      name: 'Rifa de la moto 2026',
    });

    expect(updated.name).toBe('Rifa de la moto 2026');
    expect(updated.description).toBe('Sorteo de fin de año');
    expect(updated.ticketPriceMinorUnits).toBe(10_000);
  });

  it('replaces the whole prize list', async () => {
    const created = await create({ prizes: [{ title: 'Moto' }, { title: 'Televisor' }] });

    const updated = await updateRaffle.execute({
      actorId: OWNER_ID,
      raffleId: created.id,
      prizes: [{ title: 'Carro' }],
    });

    expect(updated.prizes.map((prize) => prize.title)).toEqual(['Carro']);
  });

  it('clears an optional field when it is set to null', async () => {
    const created = await create({ description: 'Sorteo de fin de año' });

    const updated = await updateRaffle.execute({
      actorId: OWNER_ID,
      raffleId: created.id,
      description: null,
    });

    expect(updated.description).toBeNull();
  });

  it('refuses a raffle owned by someone else', async () => {
    const created = await create();

    await expect(
      updateRaffle.execute({ actorId: 'someone-else', raffleId: created.id, name: 'Robada' }),
    ).rejects.toThrow(RaffleAccessDeniedError);
  });

  it('refuses an unknown raffle', async () => {
    await expect(
      updateRaffle.execute({ actorId: OWNER_ID, raffleId: 'missing', name: 'Fantasma' }),
    ).rejects.toThrow(RaffleNotFoundError);
  });
});
