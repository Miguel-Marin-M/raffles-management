import { beforeEach, describe, expect, it } from 'vitest';

import { Raffle } from '../../domain/entities/raffle.js';
import { Ticket } from '../../domain/entities/ticket.js';
import {
  PaidTicketIsFinalError,
  TicketNumbersNotReservedError,
} from '../../domain/errors/ticket-errors.js';
import { Money } from '../../domain/value-objects/money.js';
import { NumberRange } from '../../domain/value-objects/number-range.js';
import { FixedClock } from '../../testing/fixed-clock.js';
import { InMemoryDatabase } from '../../testing/in-memory/in-memory-database.js';
import { InMemoryUnitOfWork } from '../../testing/in-memory/in-memory-unit-of-work.js';
import { SequentialIdGenerator } from '../../testing/sequential-id-generator.js';
import { CustomerResolver } from '../customers/customer-resolver.js';
import { ReassignTickets } from './reassign-tickets.js';
import { RegisterPayment } from './register-payment.js';

const OWNER_ID = 'owner-1';
const RAFFLE_ID = 'raffle-1';

describe('ReassignTickets', () => {
  let db: InMemoryDatabase;
  let unitOfWork: InMemoryUnitOfWork;
  let reassignTickets: ReassignTickets;
  let registerPayment: RegisterPayment;

  beforeEach(async () => {
    db = new InMemoryDatabase();
    unitOfWork = new InMemoryUnitOfWork(db);
    const clock = new FixedClock(new Date('2026-03-07T09:00:00Z'));
    const idGenerator = new SequentialIdGenerator();

    reassignTickets = new ReassignTickets(unitOfWork, new CustomerResolver(idGenerator, clock));
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
          customerId: 'customer-original',
          currency: 'COP',
          reservedAt: clock.now(),
        }),
      );
    }
  });

  function reassign(numbers: readonly number[]) {
    return reassignTickets.execute({
      actorId: OWNER_ID,
      raffleId: RAFFLE_ID,
      numbers,
      customer: { name: 'Carlos Ruiz', phone: '3009998877' },
    });
  }

  it('moves several numbers to another customer at once', async () => {
    const result = await reassign([7, 42]);

    expect(result.numbers).toEqual([7, 42]);
    expect(db.tickets.get('ticket-1')?.customerId).toBe(result.customerId);
    expect(db.tickets.get('ticket-3')?.customerId).toBe(result.customerId);
    expect(db.tickets.get('ticket-2')?.customerId).toBe('customer-original');
  });

  it('keeps what the previous customer had already paid', async () => {
    await registerPayment.execute({
      actorId: OWNER_ID,
      ticketId: 'ticket-1',
      amountMinorUnits: 4_000,
    });

    await reassign([7]);

    expect(db.tickets.get('ticket-1')?.amountPaidMinorUnits).toBe(4_000);
  });

  it('records the handover of each number', async () => {
    await reassign([7, 42]);

    expect(db.ticketEvents.map((event) => [event.type, event.number])).toEqual([
      ['reassigned', 7],
      ['reassigned', 42],
    ]);
  });

  it('refuses a selection containing a paid number and moves nothing', async () => {
    await registerPayment.execute({
      actorId: OWNER_ID,
      ticketId: 'ticket-1',
      amountMinorUnits: 10_000,
    });

    await expect(reassign([7, 42])).rejects.toThrow(PaidTicketIsFinalError);
    expect(db.tickets.get('ticket-3')?.customerId).toBe('customer-original');
  });

  it('refuses a selection containing a free number', async () => {
    await expect(reassign([7, 99])).rejects.toThrow(TicketNumbersNotReservedError);
  });

  it('refuses a raffle of another organizer', async () => {
    await expect(
      reassignTickets.execute({
        actorId: 'someone-else',
        raffleId: RAFFLE_ID,
        numbers: [7],
        customer: { name: 'Carlos Ruiz' },
      }),
    ).rejects.toThrow();
  });
});
