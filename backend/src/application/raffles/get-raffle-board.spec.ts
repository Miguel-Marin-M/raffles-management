import { beforeEach, describe, expect, it } from 'vitest';

import { Raffle } from '../../domain/entities/raffle.js';
import { RaffleAccessDeniedError } from '../../domain/errors/raffle-errors.js';
import { Money } from '../../domain/value-objects/money.js';
import { NumberRange } from '../../domain/value-objects/number-range.js';
import { FixedClock } from '../../testing/fixed-clock.js';
import { InMemoryDatabase } from '../../testing/in-memory/in-memory-database.js';
import { InMemoryUnitOfWork } from '../../testing/in-memory/in-memory-unit-of-work.js';
import { SequentialIdGenerator } from '../../testing/sequential-id-generator.js';
import { CustomerResolver } from '../customers/customer-resolver.js';
import { MarkTicketsAsPaid } from '../tickets/mark-tickets-as-paid.js';
import { RegisterPayment } from '../tickets/register-payment.js';
import { ReserveTickets } from '../tickets/reserve-tickets.js';
import { GetRaffleBoard } from './get-raffle-board.js';

const OWNER_ID = 'owner-1';
const RAFFLE_ID = 'raffle-1';

describe('GetRaffleBoard', () => {
  let unitOfWork: InMemoryUnitOfWork;
  let getBoard: GetRaffleBoard;
  let reserveTickets: ReserveTickets;
  let markAsPaid: MarkTicketsAsPaid;
  let registerPayment: RegisterPayment;

  beforeEach(async () => {
    unitOfWork = new InMemoryUnitOfWork(new InMemoryDatabase());
    const clock = new FixedClock(new Date('2026-03-05T07:00:00Z'));
    const idGenerator = new SequentialIdGenerator();

    reserveTickets = new ReserveTickets(
      unitOfWork,
      new CustomerResolver(idGenerator, clock),
      idGenerator,
      clock,
    );
    markAsPaid = new MarkTicketsAsPaid(unitOfWork, idGenerator, clock);
    registerPayment = new RegisterPayment(unitOfWork, idGenerator, clock);
    getBoard = new GetRaffleBoard(
      unitOfWork.repositories.raffles,
      unitOfWork.repositories.tickets,
      unitOfWork.repositories.customers,
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

  function reserve(numbers: readonly number[], name: string) {
    return reserveTickets.execute({
      actorId: OWNER_ID,
      raffleId: RAFFLE_ID,
      numbers,
      customer: { name },
    });
  }

  it('reports an untouched board as fully free', async () => {
    const board = await getBoard.execute({ actorId: OWNER_ID, raffleId: RAFFLE_ID });

    expect(board.takenCells).toHaveLength(0);
    expect(board.summary.freeNumbers).toBe(100);
    expect(board.summary.potentialMinorUnits).toBe(1_000_000);
  });

  it('lists only the taken numbers, with their customer', async () => {
    await reserve([7, 42], 'Ana Torres');

    const board = await getBoard.execute({ actorId: OWNER_ID, raffleId: RAFFLE_ID });

    expect(board.takenCells.map((cell) => cell.number)).toEqual([7, 42]);
    expect(board.takenCells[0]?.customerName).toBe('Ana Torres');
    expect(board.takenCells[0]?.label).toBe('07');
    expect(board.summary.freeNumbers).toBe(98);
    expect(board.summary.reservedNumbers).toBe(2);
  });

  it('separates reserved from paid numbers and totals the money', async () => {
    await reserve([7, 42], 'Ana Torres');
    await markAsPaid.execute({ actorId: OWNER_ID, raffleId: RAFFLE_ID, numbers: [7] });

    const board = await getBoard.execute({ actorId: OWNER_ID, raffleId: RAFFLE_ID });

    expect(board.summary.paidNumbers).toBe(1);
    expect(board.summary.reservedNumbers).toBe(1);
    expect(board.summary.collectedMinorUnits).toBe(10_000);
    expect(board.summary.pendingMinorUnits).toBe(10_000);
  });

  it('counts a partial payment as collected and still pending', async () => {
    const reserved = await reserve([7], 'Ana Torres');
    const board = await getBoard.execute({ actorId: OWNER_ID, raffleId: RAFFLE_ID });
    const ticketId = board.takenCells[0]?.ticketId ?? '';

    await registerPayment.execute({
      actorId: OWNER_ID,
      ticketId,
      amountMinorUnits: 4_000,
    });
    const updated = await getBoard.execute({ actorId: OWNER_ID, raffleId: RAFFLE_ID });

    expect(reserved.numbers).toEqual([7]);
    expect(updated.summary.collectedMinorUnits).toBe(4_000);
    expect(updated.summary.pendingMinorUnits).toBe(6_000);
    expect(updated.takenCells[0]?.status).toBe('reserved');
  });

  it('refuses a board owned by another organizer', async () => {
    await expect(
      getBoard.execute({ actorId: 'someone-else', raffleId: RAFFLE_ID }),
    ).rejects.toThrow(RaffleAccessDeniedError);
  });
});
