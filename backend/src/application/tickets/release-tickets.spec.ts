import { beforeEach, describe, expect, it } from 'vitest';

import { Raffle } from '../../domain/entities/raffle.js';
import { Ticket } from '../../domain/entities/ticket.js';
import {
  TicketHasPaymentsError,
  TicketNumbersNotReservedError,
} from '../../domain/errors/ticket-errors.js';
import { Money } from '../../domain/value-objects/money.js';
import { NumberRange } from '../../domain/value-objects/number-range.js';
import { FixedClock } from '../../testing/fixed-clock.js';
import { InMemoryDatabase } from '../../testing/in-memory/in-memory-database.js';
import { InMemoryUnitOfWork } from '../../testing/in-memory/in-memory-unit-of-work.js';
import { SequentialIdGenerator } from '../../testing/sequential-id-generator.js';
import { RegisterPayment } from './register-payment.js';
import { ReleaseTickets } from './release-tickets.js';

const OWNER_ID = 'owner-1';
const RAFFLE_ID = 'raffle-1';

describe('ReleaseTickets', () => {
  let db: InMemoryDatabase;
  let unitOfWork: InMemoryUnitOfWork;
  let clock: FixedClock;
  let registerPayment: RegisterPayment;
  let subject: ReleaseTickets;

  beforeEach(async () => {
    db = new InMemoryDatabase();
    unitOfWork = new InMemoryUnitOfWork(db);
    clock = new FixedClock(new Date('2026-03-03T08:00:00Z'));
    const idGenerator = new SequentialIdGenerator('payment');

    subject = new ReleaseTickets(unitOfWork);
    registerPayment = new RegisterPayment(unitOfWork, idGenerator, clock);

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

    for (const [index, number] of [7, 13, 42].entries()) {
      await unitOfWork.repositories.tickets.save(
        Ticket.reserve({
          id: `ticket-${index + 1}`,
          raffleId: RAFFLE_ID,
          number,
          customerId: 'customer-1',
          currency: 'COP',
          reservedAt: clock.now(),
        }),
      );
    }
  });

  it('frees the numbers so they can be reserved again', async () => {
    const result = await subject.execute({
      actorId: OWNER_ID,
      raffleId: RAFFLE_ID,
      numbers: [13],
    });

    expect(result.releasedNumbers).toEqual([13]);
    expect(db.takenNumbers(RAFFLE_ID)).toEqual(new Set([7, 42]));
    expect(db.ticketEvents.at(-1)?.type).toBe('released');
  });

  it('refuses to release a ticket that already collected money', async () => {
    await registerPayment.execute({
      actorId: OWNER_ID,
      ticketId: 'ticket-2',
      amountMinorUnits: 5_000,
    });

    await expect(
      subject.execute({ actorId: OWNER_ID, raffleId: RAFFLE_ID, numbers: [13] }),
    ).rejects.toThrow(TicketHasPaymentsError);
    expect(db.takenNumbers(RAFFLE_ID)).toEqual(new Set([7, 13, 42]));
  });

  it('releases nothing when part of the selection is free', async () => {
    await expect(
      subject.execute({ actorId: OWNER_ID, raffleId: RAFFLE_ID, numbers: [13, 99] }),
    ).rejects.toThrow(TicketNumbersNotReservedError);
    expect(db.tickets.size).toBe(3);
  });
});
