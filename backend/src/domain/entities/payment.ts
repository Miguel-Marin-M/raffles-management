import { ValidationError } from '../errors/domain-error.js';
import { Money } from '../value-objects/money.js';

export type PaymentMethod = 'cash' | 'transfer' | 'card' | 'other';

export interface PaymentSnapshot {
  readonly id: string;
  readonly ticketId: string;
  readonly amountMinorUnits: number;
  readonly currency: string;
  readonly method: PaymentMethod;
  readonly note: string | null;
  readonly paidAt: Date;
  readonly createdBy: string | null;
}

/**
 * A single payment against a ticket.
 *
 * Payments are immutable: correcting one means recording another rather than
 * editing history, which keeps the ticket balance auditable.
 */
export class Payment {
  private constructor(
    readonly id: string,
    readonly ticketId: string,
    readonly amount: Money,
    readonly method: PaymentMethod,
    readonly note: string | null,
    readonly paidAt: Date,
    readonly createdBy: string | null,
  ) {}

  static create(input: {
    id: string;
    ticketId: string;
    amount: Money;
    paidAt: Date;
    method?: PaymentMethod;
    note?: string | null;
    createdBy?: string | null;
  }): Payment {
    if (!input.amount.isPositive()) {
      throw new ValidationError('Payment amount must be greater than zero');
    }

    const note = input.note?.trim();
    return new Payment(
      input.id,
      input.ticketId,
      input.amount,
      input.method ?? 'cash',
      note === undefined || note === '' ? null : note,
      input.paidAt,
      input.createdBy ?? null,
    );
  }

  static restore(snapshot: PaymentSnapshot): Payment {
    return new Payment(
      snapshot.id,
      snapshot.ticketId,
      Money.fromMinorUnits(snapshot.amountMinorUnits, snapshot.currency),
      snapshot.method,
      snapshot.note,
      snapshot.paidAt,
      snapshot.createdBy,
    );
  }

  toSnapshot(): PaymentSnapshot {
    return {
      id: this.id,
      ticketId: this.ticketId,
      amountMinorUnits: this.amount.minorUnits,
      currency: this.amount.currency,
      method: this.method,
      note: this.note,
      paidAt: this.paidAt,
      createdBy: this.createdBy,
    };
  }
}
