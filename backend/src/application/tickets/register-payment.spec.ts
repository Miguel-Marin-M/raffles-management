import { beforeEach, describe, expect, it } from 'vitest';

import { Raffle } from '../../domain/entities/raffle.js';
import { Ticket } from '../../domain/entities/ticket.js';
import { PaymentExceedsOutstandingError } from '../../domain/errors/ticket-errors.js';
import { Money } from '../../domain/value-objects/money.js';
import { NumberRange } from '../../domain/value-objects/number-range.js';
import { FixedClock } from '../../testing/fixed-clock.js';
import { InMemoryDatabase } from '../../testing/in-memory/in-memory-database.js';
import { InMemoryUnitOfWork } from '../../testing/in-memory/in-memory-unit-of-work.js';
import { SequentialIdGenerator } from '../../testing/sequential-id-generator.js';
import { RegisterPayment } from './register-payment.js';

const OWNER_ID = 'owner-1';
const RAFFLE_ID = 'raffle-1';
const TICKET_ID = 'ticket-1';

describe('RegisterPayment', () => {
  let db: InMemoryDatabase;
  let unitOfWork: InMemoryUnitOfWork;
  let registerPayment: RegisterPayment;

  beforeEach(async () => {
    db = new InMemoryDatabase();
    unitOfWork = new InMemoryUnitOfWork(db);
    const clock = new FixedClock(new Date('2026-03-02T12:00:00Z'));
    registerPayment = new RegisterPayment(unitOfWork, new SequentialIdGenerator('payment'), clock);

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
    await unitOfWork.repositories.tickets.save(
      Ticket.reserve({
        id: TICKET_ID,
        raffleId: RAFFLE_ID,
        number: 42,
        customerId: 'customer-1',
        currency: 'COP',
        reservedAt: clock.now(),
      }),
    );
  });

  it('keeps the ticket reserved after a partial payment', async () => {
    const result = await registerPayment.execute({
      actorId: OWNER_ID,
      ticketId: TICKET_ID,
      amountMinorUnits: 4_000,
    });

    expect(result.status).toBe('reserved');
    expect(result.outstandingMinorUnits).toBe(6_000);
    expect(db.payments.size).toBe(1);
  });

  it('marks the ticket paid when the instalments cover the price', async () => {
    await registerPayment.execute({
      actorId: OWNER_ID,
      ticketId: TICKET_ID,
      amountMinorUnits: 4_000,
    });
    const result = await registerPayment.execute({
      actorId: OWNER_ID,
      ticketId: TICKET_ID,
      amountMinorUnits: 6_000,
    });

    expect(result.status).toBe('paid');
    expect(result.outstandingMinorUnits).toBe(0);
    expect(db.ticketEvents.map((event) => event.type)).toEqual([
      'payment_registered',
      'payment_registered',
      'paid',
    ]);
  });

  it('rejects paying more than what is owed and stores nothing', async () => {
    await expect(
      registerPayment.execute({
        actorId: OWNER_ID,
        ticketId: TICKET_ID,
        amountMinorUnits: 15_000,
      }),
    ).rejects.toThrow(PaymentExceedsOutstandingError);

    expect(db.payments.size).toBe(0);
    expect(db.tickets.get(TICKET_ID)?.amountPaidMinorUnits).toBe(0);
  });

  it('rejects a ticket belonging to another organizer', async () => {
    await expect(
      registerPayment.execute({
        actorId: 'someone-else',
        ticketId: TICKET_ID,
        amountMinorUnits: 1_000,
      }),
    ).rejects.toThrow();
  });
});
