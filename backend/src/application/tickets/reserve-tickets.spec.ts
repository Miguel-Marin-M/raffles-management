import { beforeEach, describe, expect, it } from 'vitest';

import { Raffle } from '../../domain/entities/raffle.js';
import {
  CustomerNotFoundError,
  DuplicateCustomerPhoneError,
} from '../../domain/errors/customer-errors.js';
import { RaffleClosedError, RaffleNotFoundError } from '../../domain/errors/raffle-errors.js';
import {
  EmptyTicketSelectionError,
  TicketNumbersOutOfRangeError,
  TicketsAlreadyTakenError,
} from '../../domain/errors/ticket-errors.js';
import { Money } from '../../domain/value-objects/money.js';
import { NumberRange } from '../../domain/value-objects/number-range.js';
import { FixedClock } from '../../testing/fixed-clock.js';
import { InMemoryDatabase } from '../../testing/in-memory/in-memory-database.js';
import { InMemoryUnitOfWork } from '../../testing/in-memory/in-memory-unit-of-work.js';
import { SequentialIdGenerator } from '../../testing/sequential-id-generator.js';
import { CustomerResolver } from '../customers/customer-resolver.js';
import { ReserveTickets } from './reserve-tickets.js';

const OWNER_ID = 'owner-1';
const RAFFLE_ID = 'raffle-1';

describe('ReserveTickets', () => {
  let db: InMemoryDatabase;
  let unitOfWork: InMemoryUnitOfWork;
  let clock: FixedClock;
  let reserveTickets: ReserveTickets;

  beforeEach(async () => {
    db = new InMemoryDatabase();
    unitOfWork = new InMemoryUnitOfWork(db);
    clock = new FixedClock(new Date('2026-03-01T10:00:00Z'));
    const idGenerator = new SequentialIdGenerator();

    reserveTickets = new ReserveTickets(
      unitOfWork,
      new CustomerResolver(idGenerator, clock),
      idGenerator,
      clock,
    );

    await unitOfWork.repositories.raffles.save(
      Raffle.create({
        id: RAFFLE_ID,
        ownerId: OWNER_ID,
        name: 'Rifa de la moto',
        ticketPrice: Money.fromMinorUnits(10_000),
        range: NumberRange.twoDigits(),
        createdAt: clock.now(),
        status: 'active',
      }),
    );
  });

  const PHONES: Record<string, string> = {
    'Ana Torres': '3001112233',
    'Otro cliente': '3009998877',
  };

  function reserve(numbers: readonly number[], customerName = 'Ana Torres') {
    return reserveTickets.execute({
      actorId: OWNER_ID,
      raffleId: RAFFLE_ID,
      numbers,
      customer: { name: customerName, phone: PHONES[customerName] ?? '3005550000' },
    });
  }

  it('reserves several numbers for one customer and prices them', async () => {
    const result = await reserve([42, 7, 13]);

    expect(result.numbers).toEqual([7, 13, 42]);
    expect(result.totalMinorUnits).toBe(30_000);
    expect(db.tickets.size).toBe(3);
  });

  it('records an audit event per reserved number', async () => {
    await reserve([1, 2]);

    expect(db.ticketEvents.map((event) => event.type)).toEqual(['reserved', 'reserved']);
    expect(db.ticketEvents.map((event) => event.number)).toEqual([1, 2]);
  });

  it('registers the customer once and keeps using it', async () => {
    await reserve([1]);
    await reserve([2]);

    expect(db.customers.size).toBe(1);
  });

  it('refuses a phone that already belongs to somebody else', async () => {
    await reserve([1], 'Ana Torres');

    await expect(
      reserveTickets.execute({
        actorId: OWNER_ID,
        raffleId: RAFFLE_ID,
        numbers: [2],
        customer: { name: 'Ana María', phone: '3001112233' },
      }),
    ).rejects.toThrow(DuplicateCustomerPhoneError);
    expect(db.customers.size).toBe(1);
    expect(db.takenNumbers(RAFFLE_ID)).toEqual(new Set([1]));
  });

  it('merges both records under the new name when told to', async () => {
    const first = await reserve([1], 'Ana Torres');

    const merged = await reserveTickets.execute({
      actorId: OWNER_ID,
      raffleId: RAFFLE_ID,
      numbers: [2],
      customer: { id: first.customerId, name: 'Ana María Torres' },
    });

    expect(merged.customerId).toBe(first.customerId);
    expect(db.customers.get(first.customerId)?.name).toBe('Ana María Torres');
    expect(db.customers.size).toBe(1);
  });

  it('collapses repeated numbers in the same selection', async () => {
    const result = await reserve([5, 5, 5]);

    expect(result.numbers).toEqual([5]);
    expect(db.tickets.size).toBe(1);
  });

  it('refuses a number that is already taken', async () => {
    await reserve([20]);

    await expect(reserve([20], 'Otro cliente')).rejects.toThrow(TicketsAlreadyTakenError);
  });

  it('reserves nothing when part of the selection is taken', async () => {
    await reserve([20]);

    await expect(reserve([21, 20, 22])).rejects.toThrow(TicketsAlreadyTakenError);
    expect(db.takenNumbers(RAFFLE_ID)).toEqual(new Set([20]));
  });

  it('reports every conflicting number at once', async () => {
    await reserve([20]);
    await reserve([30], 'Otro cliente');

    await expect(reserve([30, 20, 40])).rejects.toMatchObject({
      numbers: [20, 30],
    });
  });

  it('rejects numbers outside the raffle range', async () => {
    await expect(reserve([100])).rejects.toThrow(TicketNumbersOutOfRangeError);
  });

  it('rejects an empty selection', async () => {
    await expect(reserve([])).rejects.toThrow(EmptyTicketSelectionError);
  });

  it('rejects a raffle owned by another organizer', async () => {
    await expect(
      reserveTickets.execute({
        actorId: 'someone-else',
        raffleId: RAFFLE_ID,
        numbers: [1],
        customer: { name: 'Ana Torres' },
      }),
    ).rejects.toThrow();
  });

  it('rejects an unknown raffle', async () => {
    await expect(
      reserveTickets.execute({
        actorId: OWNER_ID,
        raffleId: 'missing',
        numbers: [1],
        customer: { name: 'Ana Torres' },
      }),
    ).rejects.toThrow(RaffleNotFoundError);
  });

  it('rejects an unknown customer id', async () => {
    await expect(
      reserveTickets.execute({
        actorId: OWNER_ID,
        raffleId: RAFFLE_ID,
        numbers: [1],
        customer: { id: 'missing' },
      }),
    ).rejects.toThrow(CustomerNotFoundError);
  });

  it('refuses to reserve on a closed raffle', async () => {
    const raffle = await unitOfWork.repositories.raffles.findById(RAFFLE_ID);
    raffle?.close();
    if (raffle !== null) await unitOfWork.repositories.raffles.save(raffle);

    await expect(reserve([1])).rejects.toThrow(RaffleClosedError);
  });
});
