import { ValidationError } from '../errors/domain-error.js';
import {
  PaidTicketIsFinalError,
  PaymentExceedsOutstandingError,
  TicketAlreadyPaidError,
} from '../errors/ticket-errors.js';
import { Money } from '../value-objects/money.js';

export type TicketStatus = 'reserved' | 'paid';

export interface TicketSnapshot {
  readonly id: string;
  readonly raffleId: string;
  readonly number: number;
  readonly customerId: string;
  readonly status: TicketStatus;
  readonly amountPaidMinorUnits: number;
  readonly currency: string;
  readonly notes: string | null;
  readonly reservedAt: Date;
  readonly paidAt: Date | null;
  readonly createdBy: string | null;
}

/**
 * A number taken by a customer, either reserved or paid.
 *
 * Free numbers are not modelled: they are the absence of a ticket. Releasing a
 * ticket therefore deletes it instead of moving it to another status.
 */
export class Ticket {
  private constructor(
    readonly id: string,
    readonly raffleId: string,
    readonly number: number,
    private currentCustomerId: string,
    private currentStatus: TicketStatus,
    private currentAmountPaid: Money,
    private currentNotes: string | null,
    readonly reservedAt: Date,
    private currentPaidAt: Date | null,
    readonly createdBy: string | null,
  ) {}

  static reserve(input: {
    id: string;
    raffleId: string;
    number: number;
    customerId: string;
    currency: string;
    reservedAt: Date;
    createdBy?: string | null;
    notes?: string | null;
  }): Ticket {
    return new Ticket(
      input.id,
      input.raffleId,
      input.number,
      input.customerId,
      'reserved',
      Money.zero(input.currency),
      Ticket.normalizeNotes(input.notes),
      input.reservedAt,
      null,
      input.createdBy ?? null,
    );
  }

  static restore(snapshot: TicketSnapshot): Ticket {
    return new Ticket(
      snapshot.id,
      snapshot.raffleId,
      snapshot.number,
      snapshot.customerId,
      snapshot.status,
      Money.fromMinorUnits(snapshot.amountPaidMinorUnits, snapshot.currency),
      snapshot.notes,
      snapshot.reservedAt,
      snapshot.paidAt,
      snapshot.createdBy,
    );
  }

  get customerId(): string {
    return this.currentCustomerId;
  }

  get status(): TicketStatus {
    return this.currentStatus;
  }

  get amountPaid(): Money {
    return this.currentAmountPaid;
  }

  get notes(): string | null {
    return this.currentNotes;
  }

  get paidAt(): Date | null {
    return this.currentPaidAt;
  }

  isPaid(): boolean {
    return this.currentStatus === 'paid';
  }

  /** What the customer still owes for this ticket. */
  outstanding(ticketPrice: Money): Money {
    if (this.currentAmountPaid.isAtLeast(ticketPrice)) return Money.zero(ticketPrice.currency);
    return ticketPrice.subtract(this.currentAmountPaid);
  }

  /**
   * Applies a payment, marking the ticket paid once the price is covered.
   * Partial payments are allowed; overpayments are rejected.
   */
  registerPayment(amount: Money, ticketPrice: Money, at: Date): void {
    if (this.isPaid()) throw new TicketAlreadyPaidError(this.id);
    if (!amount.isPositive()) throw new ValidationError('Payment amount must be positive');

    const outstanding = this.outstanding(ticketPrice);
    if (amount.isGreaterThan(outstanding)) {
      throw new PaymentExceedsOutstandingError(amount.minorUnits, outstanding.minorUnits);
    }

    this.currentAmountPaid = this.currentAmountPaid.add(amount);
    if (this.currentAmountPaid.isAtLeast(ticketPrice)) {
      this.currentStatus = 'paid';
      this.currentPaidAt = at;
    }
  }

  /**
   * Takes credit back off this ticket.
   *
   * An instalment is money from the customer, not a claim on a particular
   * number: when the organizer finally says which boletas play, whatever was
   * sitting on the others moves to them and those go back to zero.
   */
  withdrawCredit(amount: Money): void {
    if (this.isPaid()) throw new PaidTicketIsFinalError([this.number]);
    if (amount.isGreaterThan(this.currentAmountPaid)) {
      throw new ValidationError(`Ticket ${this.number} does not hold that much credit`);
    }
    this.currentAmountPaid = this.currentAmountPaid.subtract(amount);
  }

  /** Settles whatever is left, which is how the board marks a ticket as paid. */
  settle(ticketPrice: Money, at: Date): Money {
    if (this.isPaid()) throw new TicketAlreadyPaidError(this.id);

    const outstanding = this.outstanding(ticketPrice);
    this.registerPayment(outstanding, ticketPrice, at);
    return outstanding;
  }

  reassignTo(customerId: string): void {
    if (this.isPaid()) throw new PaidTicketIsFinalError([this.number]);
    if (customerId.trim() === '') throw new ValidationError('Customer is required');
    this.currentCustomerId = customerId;
  }

  changeNotes(notes: string | null): void {
    this.currentNotes = Ticket.normalizeNotes(notes);
  }

  toSnapshot(): TicketSnapshot {
    return {
      id: this.id,
      raffleId: this.raffleId,
      number: this.number,
      customerId: this.currentCustomerId,
      status: this.currentStatus,
      amountPaidMinorUnits: this.currentAmountPaid.minorUnits,
      currency: this.currentAmountPaid.currency,
      notes: this.currentNotes,
      reservedAt: this.reservedAt,
      paidAt: this.currentPaidAt,
      createdBy: this.createdBy,
    };
  }

  private static normalizeNotes(notes: string | null | undefined): string | null {
    const trimmed = notes?.trim();
    return trimmed === undefined || trimmed === '' ? null : trimmed;
  }
}
