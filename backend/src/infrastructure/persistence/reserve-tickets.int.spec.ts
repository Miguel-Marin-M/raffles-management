import { randomUUID } from 'node:crypto';

import { eq } from 'drizzle-orm';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import '../../load-env.js';

import { CustomerResolver } from '../../application/customers/customer-resolver.js';
import { ReserveTickets } from '../../application/tickets/reserve-tickets.js';
import { Raffle } from '../../domain/entities/raffle.js';
import { User } from '../../domain/entities/user.js';
import { TicketsAlreadyTakenError } from '../../domain/errors/ticket-errors.js';
import { Money } from '../../domain/value-objects/money.js';
import { NumberRange } from '../../domain/value-objects/number-range.js';
import { createDatabaseConnection, type DatabaseConnection } from '../database/client.js';
import { tickets, users } from '../database/schema/index.js';
import { SystemClock } from '../system/system-clock.js';
import { UuidIdGenerator } from '../system/uuid-id-generator.js';
import { DrizzleUnitOfWork } from './drizzle-unit-of-work.js';
import { DrizzleUserRepository } from './drizzle-user.repository.js';

/**
 * Exercises the reservation path against a real PostgreSQL, which is the only
 * place where the (raffle_id, number) unique constraint can be proven.
 */
describe('ticket reservation against PostgreSQL', () => {
  let connection: DatabaseConnection;
  let unitOfWork: DrizzleUnitOfWork;
  let reserveTickets: ReserveTickets;
  let ownerId: string;
  let raffleId: string;

  beforeAll(() => {
    connection = createDatabaseConnection();
    unitOfWork = new DrizzleUnitOfWork(connection.db);

    const idGenerator = new UuidIdGenerator();
    const clock = new SystemClock();
    reserveTickets = new ReserveTickets(
      unitOfWork,
      new CustomerResolver(idGenerator, clock),
      idGenerator,
      clock,
    );
  });

  afterAll(async () => {
    await connection.close();
  });

  beforeEach(async () => {
    ownerId = randomUUID();
    raffleId = randomUUID();

    await new DrizzleUserRepository(connection.db).save(
      User.register({
        id: ownerId,
        email: `test-${ownerId}@rifas.test`,
        passwordHash: 'not-a-real-hash',
        name: 'Organizador de prueba',
        createdAt: new Date(),
      }),
    );

    await unitOfWork.execute(async (repositories) => {
      await repositories.raffles.save(
        Raffle.create({
          id: raffleId,
          ownerId,
          name: 'Rifa de integración',
          ticketPrice: Money.fromMinorUnits(10_000),
          range: NumberRange.twoDigits(),
          createdAt: new Date(),
          status: 'active',
        }),
      );
    });
  });

  // Deleting the organizer cascades to its raffles, customers and tickets.
  afterEach(async () => {
    await connection.db.delete(users).where(eq(users.id, ownerId));
  });

  // Each customer needs their own phone: sharing one is a conflict on purpose.
  let nextPhone = 3_000_000_000;

  function reserve(numbers: readonly number[], customerName: string) {
    nextPhone += 1;
    return reserveTickets.execute({
      actorId: ownerId,
      raffleId,
      numbers,
      customer: { name: customerName, phone: String(nextPhone) },
    });
  }

  it('stores the reserved numbers', async () => {
    const result = await reserve([7, 42], 'Ana Torres');

    expect(result.numbers).toEqual([7, 42]);
    const stored = await connection.db.query.tickets.findMany({
      where: eq(tickets.raffleId, raffleId),
    });
    expect(stored.map((ticket) => ticket.number).sort((a, b) => a - b)).toEqual([7, 42]);
  });

  it('lets only one of two concurrent reservations take the same number', async () => {
    const outcomes = await Promise.allSettled([
      reserve([13], 'Cliente A'),
      reserve([13], 'Cliente B'),
    ]);

    const fulfilled = outcomes.filter((outcome) => outcome.status === 'fulfilled');
    const rejected = outcomes.filter((outcome) => outcome.status === 'rejected');

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect((rejected[0] as PromiseRejectedResult).reason).toBeInstanceOf(TicketsAlreadyTakenError);

    const stored = await connection.db.query.tickets.findMany({
      where: eq(tickets.raffleId, raffleId),
    });
    expect(stored).toHaveLength(1);
  });

  it('rolls back the whole selection when one number is already taken', async () => {
    await reserve([20], 'Cliente A');

    await expect(reserve([21, 20, 22], 'Cliente B')).rejects.toThrow(TicketsAlreadyTakenError);

    const stored = await connection.db.query.tickets.findMany({
      where: eq(tickets.raffleId, raffleId),
    });
    expect(stored.map((ticket) => ticket.number)).toEqual([20]);
  });
});
