import { describe, expect, it } from 'vitest';

import { ValidationError } from '../errors/domain-error.js';
import { PrizeListError, RaffleAccessDeniedError, RaffleClosedError } from '../errors/raffle-errors.js';
import {
  EmptyTicketSelectionError,
  TicketNumbersOutOfRangeError,
} from '../errors/ticket-errors.js';
import { Money } from '../value-objects/money.js';
import { NumberRange } from '../value-objects/number-range.js';
import { Prize } from './prize.js';
import { Raffle } from './raffle.js';

const CREATED_AT = new Date('2026-01-05T12:00:00Z');

function createRaffle(overrides: Partial<Parameters<typeof Raffle.create>[0]> = {}): Raffle {
  return Raffle.create({
    id: 'raffle-1',
    ownerId: 'owner-1',
    name: 'Rifa de la moto',
    ticketPrice: Money.fromMinorUnits(10_000),
    range: NumberRange.twoDigits(),
    createdAt: CREATED_AT,
    ...overrides,
  });
}

describe('Raffle', () => {
  it('requires a name and a positive ticket price', () => {
    expect(() => createRaffle({ name: '   ' })).toThrow(ValidationError);
    expect(() => createRaffle({ ticketPrice: Money.zero() })).toThrow(ValidationError);
  });

  it('restricts access to its owner', () => {
    const raffle = createRaffle();

    expect(() => raffle.ensureOwnedBy('owner-1')).not.toThrow();
    expect(() => raffle.ensureOwnedBy('someone-else')).toThrow(RaffleAccessDeniedError);
  });

  it('stops accepting ticket changes once closed', () => {
    const raffle = createRaffle();
    expect(() => raffle.ensureAcceptsTicketChanges()).not.toThrow();

    raffle.close();

    expect(() => raffle.ensureAcceptsTicketChanges()).toThrow(RaffleClosedError);
  });

  it('sorts a selection and removes repeated numbers', () => {
    const raffle = createRaffle();

    expect(raffle.normalizeSelection([42, 7, 42, 13])).toEqual([7, 13, 42]);
  });

  it('rejects an empty selection', () => {
    expect(() => createRaffle().normalizeSelection([])).toThrow(EmptyTicketSelectionError);
  });

  it('rejects numbers outside its range', () => {
    const raffle = createRaffle();

    try {
      raffle.normalizeSelection([5, 100, 250]);
      expect.unreachable('the selection should have been rejected');
    } catch (error) {
      expect(error).toBeInstanceOf(TicketNumbersOutOfRangeError);
      expect((error as TicketNumbersOutOfRangeError).numbers).toEqual([100, 250]);
    }
  });

  it('prices a multi-ticket reservation', () => {
    expect(createRaffle().priceFor(4).minorUnits).toBe(40_000);
  });

  it('keeps prizes ordered by position', () => {
    const raffle = createRaffle();

    raffle.replacePrizes([
      Prize.create({ id: 'p2', position: 2, title: 'Televisor' }),
      Prize.create({ id: 'p1', position: 1, title: 'Moto' }),
    ]);

    expect(raffle.prizes.map((prize) => prize.title)).toEqual(['Moto', 'Televisor']);
  });

  it('rejects two prizes claiming the same position', () => {
    const raffle = createRaffle();

    expect(() =>
      raffle.replacePrizes([
        Prize.create({ id: 'p1', position: 1, title: 'Moto' }),
        Prize.create({ id: 'p2', position: 1, title: 'Televisor' }),
      ]),
    ).toThrow(PrizeListError);
  });

  it('survives a round trip through its snapshot', () => {
    const raffle = createRaffle({
      prizes: [Prize.create({ id: 'p1', position: 1, title: 'Moto' })],
      drawDate: new Date('2026-02-01T00:00:00Z'),
    });

    expect(Raffle.restore(raffle.toSnapshot()).toSnapshot()).toEqual(raffle.toSnapshot());
  });
});
