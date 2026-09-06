import { beforeEach, describe, expect, it } from 'vitest';

import { Raffle } from '../../domain/entities/raffle.js';
import { Ticket } from '../../domain/entities/ticket.js';
import { TicketNumbersNotReservedError } from '../../domain/errors/ticket-errors.js';
import { Money } from '../../domain/value-objects/money.js';
import { NumberRange } from '../../domain/value-objects/number-range.js';
import { FixedClock } from '../../testing/fixed-clock.js';
import { InMemoryDatabase } from '../../testing/in-memory/in-memory-database.js';
import { InMemoryUnitOfWork } from '../../testing/in-memory/in-memory-unit-of-work.js';
import { SequentialIdGenerator } from '../../testing/sequential-id-generator.js';
import { MarkTicketsAsPaid } from './mark-tickets-as-paid.js';
import { RegisterGroupPayment } from './register-group-payment.js';

const OWNER_ID = 'owner-1';
const RAFFLE_ID = 'raffle-1';

describe('MarkTicketsAsPaid', () => {
  let db: InMemoryDatabase;
  let unitOfWork: InMemoryUnitOfWork;
  let clock: FixedClock;
  let registerPayment: RegisterGroupPayment;
  let subject: MarkTicketsAsPaid;

  beforeEach(async () => {
    db = new InMemoryDatabase();
    unitOfWork = new InMemoryUnitOfWork(db);
    clock = new FixedClock(new Date('2026-03-03T08:00:00Z'));
    const idGenerator = new SequentialIdGenerator('payment');

    subject = new MarkTicketsAsPaid(unitOfWork, idGenerator, clock);
    registerPayment = new RegisterGroupPayment(unitOfWork, idGenerator, clock);

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

  it('settles a whole selection and reports what was collected', async () => {
    const result = await subject.execute({
      actorId: OWNER_ID,
      raffleId: RAFFLE_ID,
      numbers: [7, 42],
    });

    expect(result.paidNumbers).toEqual([7, 42]);
    expect(result.collectedMinorUnits).toBe(20_000);
    expect(db.tickets.get('ticket-1')?.status).toBe('paid');
  });

  it('moves the instalments of the other numbers onto the ones that play', async () => {
    // 15.000 spread over 7, 13 and 42 leaves 5.000 on each.
    await registerPayment.execute({
      actorId: OWNER_ID,
      raffleId: RAFFLE_ID,
      numbers: [7, 13, 42],
      amountMinorUnits: 15_000,
    });

    const result = await subject.execute({
      actorId: OWNER_ID,
      raffleId: RAFFLE_ID,
      numbers: [7, 13],
    });

    expect(result.appliedCreditMinorUnits).toBe(5_000);
    expect(result.collectedMinorUnits).toBe(5_000);
    expect(db.tickets.get('ticket-1')?.status).toBe('paid');
    expect(db.tickets.get('ticket-2')?.status).toBe('paid');
    // The number left behind gives its instalment up.
    expect(db.tickets.get('ticket-3')?.amountPaidMinorUnits).toBe(0);
  });

  it('leaves credit the settlement did not need where it was', async () => {
    await registerPayment.execute({
      actorId: OWNER_ID,
      raffleId: RAFFLE_ID,
      numbers: [7, 13, 42],
      amountMinorUnits: 27_000,
    });

    await subject.execute({ actorId: OWNER_ID, raffleId: RAFFLE_ID, numbers: [7] });

    // Settling 7 needed 1.000 of the 18.000 sitting on 13 and 42.
    expect(db.tickets.get('ticket-1')?.status).toBe('paid');
    expect(
      (db.tickets.get('ticket-2')?.amountPaidMinorUnits ?? 0) +
        (db.tickets.get('ticket-3')?.amountPaidMinorUnits ?? 0),
    ).toBe(17_000);
  });

  it('only charges the outstanding part of a partially paid ticket', async () => {
    await registerPayment.execute({
      actorId: OWNER_ID,
      raffleId: RAFFLE_ID,
      numbers: [7],
      amountMinorUnits: 4_000,
    });

    const result = await subject.execute({
      actorId: OWNER_ID,
      raffleId: RAFFLE_ID,
      numbers: [7],
    });

    expect(result.collectedMinorUnits).toBe(6_000);
  });

  it('ignores numbers that were already paid', async () => {
    await subject.execute({ actorId: OWNER_ID, raffleId: RAFFLE_ID, numbers: [7] });

    const result = await subject.execute({
      actorId: OWNER_ID,
      raffleId: RAFFLE_ID,
      numbers: [7, 13],
    });

    expect(result.paidNumbers).toEqual([13]);
    expect(result.collectedMinorUnits).toBe(10_000);
  });

  it('refuses a selection containing a free number', async () => {
    await expect(
      subject.execute({ actorId: OWNER_ID, raffleId: RAFFLE_ID, numbers: [7, 99] }),
    ).rejects.toThrow(TicketNumbersNotReservedError);
    expect(db.tickets.get('ticket-1')?.status).toBe('reserved');
  });
});
