import { beforeEach, describe, expect, it } from 'vitest';

import {
  PaymentExceedsOutstandingError,
  TicketAlreadyPaidError,
} from '../errors/ticket-errors.js';
import { Money } from '../value-objects/money.js';
import { Ticket } from './ticket.js';

const PRICE = Money.fromMinorUnits(10_000);
const RESERVED_AT = new Date('2026-01-10T15:00:00Z');
const PAID_AT = new Date('2026-01-12T09:30:00Z');

function reserveTicket(): Ticket {
  return Ticket.reserve({
    id: 'ticket-1',
    raffleId: 'raffle-1',
    number: 42,
    customerId: 'customer-1',
    currency: PRICE.currency,
    reservedAt: RESERVED_AT,
  });
}

describe('Ticket', () => {
  let ticket: Ticket;

  beforeEach(() => {
    ticket = reserveTicket();
  });

  it('starts reserved and owing the full price', () => {
    expect(ticket.status).toBe('reserved');
    expect(ticket.amountPaid.isZero()).toBe(true);
    expect(ticket.outstanding(PRICE).minorUnits).toBe(10_000);
    expect(ticket.paidAt).toBeNull();
  });

  it('stays reserved while the payment is partial', () => {
    ticket.registerPayment(Money.fromMinorUnits(4_000), PRICE, PAID_AT);

    expect(ticket.status).toBe('reserved');
    expect(ticket.outstanding(PRICE).minorUnits).toBe(6_000);
    expect(ticket.paidAt).toBeNull();
  });

  it('becomes paid once the payments cover the price', () => {
    ticket.registerPayment(Money.fromMinorUnits(4_000), PRICE, RESERVED_AT);
    ticket.registerPayment(Money.fromMinorUnits(6_000), PRICE, PAID_AT);

    expect(ticket.status).toBe('paid');
    expect(ticket.outstanding(PRICE).isZero()).toBe(true);
    expect(ticket.paidAt).toEqual(PAID_AT);
  });

  it('rejects payments above what is owed', () => {
    ticket.registerPayment(Money.fromMinorUnits(9_000), PRICE, RESERVED_AT);

    expect(() => ticket.registerPayment(Money.fromMinorUnits(2_000), PRICE, PAID_AT)).toThrow(
      PaymentExceedsOutstandingError,
    );
    expect(ticket.outstanding(PRICE).minorUnits).toBe(1_000);
  });

  it('rejects further payments once it is paid', () => {
    ticket.settle(PRICE, PAID_AT);

    expect(() => ticket.registerPayment(Money.fromMinorUnits(1), PRICE, PAID_AT)).toThrow(
      TicketAlreadyPaidError,
    );
  });

  it('settles the remaining balance in one step', () => {
    ticket.registerPayment(Money.fromMinorUnits(2_500), PRICE, RESERVED_AT);

    const settled = ticket.settle(PRICE, PAID_AT);

    expect(settled.minorUnits).toBe(7_500);
    expect(ticket.status).toBe('paid');
  });

  it('can be handed over to another customer', () => {
    ticket.reassignTo('customer-2');

    expect(ticket.customerId).toBe('customer-2');
  });

  it('survives a round trip through its snapshot', () => {
    ticket.registerPayment(Money.fromMinorUnits(3_000), PRICE, RESERVED_AT);

    const restored = Ticket.restore(ticket.toSnapshot());

    expect(restored.toSnapshot()).toEqual(ticket.toSnapshot());
  });
});
