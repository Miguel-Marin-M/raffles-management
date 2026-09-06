import { beforeEach, describe, expect, it } from 'vitest';

import { Raffle } from '../../domain/entities/raffle.js';
import { Ticket } from '../../domain/entities/ticket.js';
import { TicketNotFoundError } from '../../domain/errors/ticket-errors.js';
import { Money } from '../../domain/value-objects/money.js';
import { NumberRange } from '../../domain/value-objects/number-range.js';
import { FixedClock } from '../../testing/fixed-clock.js';
import { InMemoryDatabase } from '../../testing/in-memory/in-memory-database.js';
import { InMemoryUnitOfWork } from '../../testing/in-memory/in-memory-unit-of-work.js';
import { SequentialIdGenerator } from '../../testing/sequential-id-generator.js';
import { CustomerResolver } from '../customers/customer-resolver.js';
import { ReassignTicket } from './reassign-ticket.js';
import { RegisterPayment } from './register-payment.js';

const OWNER_ID = 'owner-1';
const RAFFLE_ID = 'raffle-1';
const TICKET_ID = 'ticket-1';

describe('ReassignTicket', () => {
  let db: InMemoryDatabase;
  let unitOfWork: InMemoryUnitOfWork;
  let reassignTicket: ReassignTicket;
  let registerPayment: RegisterPayment;

  beforeEach(async () => {
    db = new InMemoryDatabase();
    unitOfWork = new InMemoryUnitOfWork(db);
    const clock = new FixedClock(new Date('2026-03-07T09:00:00Z'));
    const idGenerator = new SequentialIdGenerator();

    reassignTicket = new ReassignTicket(unitOfWork, new CustomerResolver(idGenerator, clock));
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
    await unitOfWork.repositories.tickets.save(
      Ticket.reserve({
        id: TICKET_ID,
        raffleId: RAFFLE_ID,
        number: 42,
        customerId: 'customer-original',
        currency: 'COP',
        reservedAt: clock.now(),
      }),
    );
  });

  it('moves the number to another customer', async () => {
    const result = await reassignTicket.execute({
      actorId: OWNER_ID,
      ticketId: TICKET_ID,
      customer: { name: 'Carlos Ruiz', phone: '3009998877' },
    });

    expect(result.number).toBe(42);
    expect(db.tickets.get(TICKET_ID)?.customerId).toBe(result.customerId);
    expect(result.customerId).not.toBe('customer-original');
  });

  it('keeps what the previous customer had already paid', async () => {
    await registerPayment.execute({
      actorId: OWNER_ID,
      ticketId: TICKET_ID,
      amountMinorUnits: 4_000,
    });

    await reassignTicket.execute({
      actorId: OWNER_ID,
      ticketId: TICKET_ID,
      customer: { name: 'Carlos Ruiz' },
    });

    expect(db.tickets.get(TICKET_ID)?.amountPaidMinorUnits).toBe(4_000);
  });

  it('records the handover in the audit trail', async () => {
    await reassignTicket.execute({
      actorId: OWNER_ID,
      ticketId: TICKET_ID,
      customer: { name: 'Carlos Ruiz' },
    });

    const event = db.ticketEvents.at(-1);
    expect(event?.type).toBe('reassigned');
    expect(event?.payload).toMatchObject({ from: 'customer-original' });
  });

  it('rejects an unknown ticket', async () => {
    await expect(
      reassignTicket.execute({
        actorId: OWNER_ID,
        ticketId: 'missing',
        customer: { name: 'Carlos Ruiz' },
      }),
    ).rejects.toThrow(TicketNotFoundError);
  });

  it('rejects a ticket of another organizer', async () => {
    await expect(
      reassignTicket.execute({
        actorId: 'someone-else',
        ticketId: TICKET_ID,
        customer: { name: 'Carlos Ruiz' },
      }),
    ).rejects.toThrow();
  });
});
