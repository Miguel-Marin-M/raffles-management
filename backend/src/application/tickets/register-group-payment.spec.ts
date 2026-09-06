import { beforeEach, describe, expect, it } from 'vitest';

import { Raffle } from '../../domain/entities/raffle.js';
import { Ticket } from '../../domain/entities/ticket.js';
import { ValidationError } from '../../domain/errors/domain-error.js';
import { PaymentExceedsOutstandingError } from '../../domain/errors/ticket-errors.js';
import { Money } from '../../domain/value-objects/money.js';
import { NumberRange } from '../../domain/value-objects/number-range.js';
import { FixedClock } from '../../testing/fixed-clock.js';
import { InMemoryDatabase } from '../../testing/in-memory/in-memory-database.js';
import { InMemoryUnitOfWork } from '../../testing/in-memory/in-memory-unit-of-work.js';
import { SequentialIdGenerator } from '../../testing/sequential-id-generator.js';
import { RegisterGroupPayment } from './register-group-payment.js';

const OWNER_ID = 'owner-1';
const RAFFLE_ID = 'raffle-1';
const PRICE = 25_000;

describe('RegisterGroupPayment', () => {
  let db: InMemoryDatabase;
  let unitOfWork: InMemoryUnitOfWork;
  let registerPayment: RegisterGroupPayment;

  beforeEach(async () => {
    db = new InMemoryDatabase();
    unitOfWork = new InMemoryUnitOfWork(db);
    const clock = new FixedClock(new Date('2026-03-11T09:00:00Z'));
    registerPayment = new RegisterGroupPayment(
      unitOfWork,
      new SequentialIdGenerator('payment'),
      clock,
    );

    await unitOfWork.repositories.raffles.save(
      Raffle.create({
        id: RAFFLE_ID,
        ownerId: OWNER_ID,
        name: 'Rifa de la moto',
        ticketPrice: Money.fromMinorUnits(PRICE),
        range: NumberRange.twoDigits(),
        createdAt: clock.now(),
        status: 'active',
      }),
    );

    for (const [index, number] of [3, 4, 13].entries()) {
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

  function pay(numbers: readonly number[], amountMinorUnits: number) {
    return registerPayment.execute({
      actorId: OWNER_ID,
      raffleId: RAFFLE_ID,
      numbers,
      amountMinorUnits,
    });
  }

  function balances(): number[] {
    return ['ticket-1', 'ticket-2', 'ticket-3'].map(
      (id) => db.tickets.get(id)?.amountPaidMinorUnits ?? 0,
    );
  }

  it('leaves every number equally short after a partial instalment', async () => {
    const result = await pay([3, 4, 13], 30_000);

    expect(balances()).toEqual([10_000, 10_000, 10_000]);
    expect(result.paidNumbers).toEqual([]);
    expect(db.tickets.get('ticket-1')?.status).toBe('reserved');
  });

  it('settles every number once the instalments cover the whole debt', async () => {
    await pay([3, 4, 13], 30_000);
    const result = await pay([3, 4, 13], 45_000);

    expect(balances()).toEqual([PRICE, PRICE, PRICE]);
    expect(result.paidNumbers).toEqual([3, 4, 13]);
    expect(result.outstandingMinorUnits).toBe(0);
  });

  it('hands the indivisible remainder to the first numbers', async () => {
    await pay([3, 4, 13], 10_000);

    expect(balances()).toEqual([3_334, 3_333, 3_333]);
  });

  it('gives the leftover of a full number to the others', async () => {
    // The 3 only owes 5.000, so the rest of the instalment goes to 4 and 13.
    await pay([3], 20_000);
    await pay([3, 4, 13], 15_000);

    expect(balances()).toEqual([PRICE, 5_000, 5_000]);
    expect(db.tickets.get('ticket-1')?.status).toBe('paid');
  });

  it('refuses more money than the selection owes', async () => {
    await expect(pay([3, 4], 50_001)).rejects.toThrow(PaymentExceedsOutstandingError);
    expect(balances()).toEqual([0, 0, 0]);
  });

  it('refuses zero and negative amounts', async () => {
    await expect(pay([3], 0)).rejects.toThrow(ValidationError);
    await expect(pay([3], -5_000)).rejects.toThrow(ValidationError);
  });

  it('records one payment per number', async () => {
    await pay([3, 4], 10_000);

    expect(db.payments.size).toBe(2);
  });
});
