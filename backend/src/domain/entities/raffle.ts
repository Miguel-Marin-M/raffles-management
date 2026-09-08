import { ValidationError } from '../errors/domain-error.js';
import {
  ClosedRaffleIsFinalError,
  MissingPrizeWinnersError,
  PrizeListError,
  RaffleAccessDeniedError,
  RaffleClosedError,
  RaffleNotClosedError,
} from '../errors/raffle-errors.js';
import {
  EmptyTicketSelectionError,
  TicketNumbersOutOfRangeError,
} from '../errors/ticket-errors.js';
import { Money } from '../value-objects/money.js';
import { NumberRange } from '../value-objects/number-range.js';
import { Prize, type PrizeSnapshot } from './prize.js';

export type RaffleStatus = 'draft' | 'active' | 'closed';

/** Who answers for the raffle and where the money is collected. */
interface OrganizerContact {
  readonly organizerName: string | null;
  readonly bankName: string | null;
  readonly bankAccount: string | null;
}

type ContactInput = {
  readonly [K in keyof OrganizerContact]?: string | null;
};

export interface RaffleSnapshot {
  readonly id: string;
  readonly ownerId: string;
  readonly name: string;
  readonly description: string | null;
  readonly ticketPriceMinorUnits: number;
  readonly currency: string;
  readonly numberMin: number;
  readonly numberMax: number;
  readonly numberDigits: number;
  readonly drawDate: Date | null;
  readonly lotteryReference: string | null;
  readonly organizerName: string | null;
  readonly bankName: string | null;
  readonly bankAccount: string | null;
  readonly status: RaffleStatus;
  readonly prizes: readonly PrizeSnapshot[];
  readonly createdAt: Date;
}

/**
 * Aggregate root for a raffle: ticket price, number range and prize list.
 *
 * Tickets are not held in memory here because a raffle can have thousands of
 * them; the raffle owns the rules they must satisfy, not the collection.
 */
export class Raffle {
  private constructor(
    readonly id: string,
    readonly ownerId: string,
    private currentName: string,
    private currentDescription: string | null,
    private currentTicketPrice: Money,
    private currentRange: NumberRange,
    private currentDrawDate: Date | null,
    private currentLotteryReference: string | null,
    private currentContact: OrganizerContact,
    private currentStatus: RaffleStatus,
    private currentPrizes: Prize[],
    readonly createdAt: Date,
  ) {}

  static create(input: {
    id: string;
    ownerId: string;
    name: string;
    ticketPrice: Money;
    range: NumberRange;
    createdAt: Date;
    description?: string | null;
    drawDate?: Date | null;
    lotteryReference?: string | null;
    organizerName?: string | null;
    bankName?: string | null;
    bankAccount?: string | null;
    prizes?: readonly Prize[];
    status?: RaffleStatus;
  }): Raffle {
    if (!input.ticketPrice.isPositive()) {
      throw new ValidationError('Ticket price must be greater than zero');
    }

    return new Raffle(
      input.id,
      input.ownerId,
      Raffle.normalizeName(input.name),
      Raffle.normalizeText(input.description),
      input.ticketPrice,
      input.range,
      input.drawDate ?? null,
      Raffle.normalizeText(input.lotteryReference),
      Raffle.normalizeContact(input),
      input.status ?? 'draft',
      Raffle.validatePrizes(input.prizes ?? []),
      input.createdAt,
    );
  }

  static restore(snapshot: RaffleSnapshot): Raffle {
    return new Raffle(
      snapshot.id,
      snapshot.ownerId,
      snapshot.name,
      snapshot.description,
      Money.fromMinorUnits(snapshot.ticketPriceMinorUnits, snapshot.currency),
      NumberRange.create(snapshot.numberMin, snapshot.numberMax, snapshot.numberDigits),
      snapshot.drawDate,
      snapshot.lotteryReference,
      Raffle.normalizeContact(snapshot),
      snapshot.status,
      snapshot.prizes.map((prize) => Prize.restore(prize)),
      snapshot.createdAt,
    );
  }

  get name(): string {
    return this.currentName;
  }

  get description(): string | null {
    return this.currentDescription;
  }

  get ticketPrice(): Money {
    return this.currentTicketPrice;
  }

  get range(): NumberRange {
    return this.currentRange;
  }

  get drawDate(): Date | null {
    return this.currentDrawDate;
  }

  get lotteryReference(): string | null {
    return this.currentLotteryReference;
  }

  get organizerName(): string | null {
    return this.currentContact.organizerName;
  }

  get bankName(): string | null {
    return this.currentContact.bankName;
  }

  get bankAccount(): string | null {
    return this.currentContact.bankAccount;
  }

  get status(): RaffleStatus {
    return this.currentStatus;
  }

  get prizes(): readonly Prize[] {
    return this.currentPrizes;
  }

  get currency(): string {
    return this.currentTicketPrice.currency;
  }

  isOwnedBy(userId: string): boolean {
    return this.ownerId === userId;
  }

  ensureOwnedBy(userId: string): void {
    if (!this.isOwnedBy(userId)) throw new RaffleAccessDeniedError(this.id);
  }

  /** Closed raffles are read-only: no reservations, payments or releases. */
  ensureAcceptsTicketChanges(): void {
    if (this.currentStatus === 'closed') throw new RaffleClosedError(this.id);
  }

  /**
   * Normalizes a selection coming from the board: rejects empty selections and
   * numbers outside the range, and drops duplicates so the same number is never
   * inserted twice within one reservation.
   */
  normalizeSelection(numbers: readonly number[]): number[] {
    if (numbers.length === 0) throw new EmptyTicketSelectionError();

    const outOfRange = numbers.filter((number) => !this.currentRange.contains(number));
    if (outOfRange.length > 0) {
      throw new TicketNumbersOutOfRangeError(
        [...new Set(outOfRange)].sort((a, b) => a - b),
        this.currentRange.min,
        this.currentRange.max,
      );
    }

    return [...new Set(numbers)].sort((a, b) => a - b);
  }

  priceFor(ticketCount: number): Money {
    return this.currentTicketPrice.multiply(ticketCount);
  }

  updateDetails(input: {
    name?: string;
    description?: string | null;
    ticketPrice?: Money;
    drawDate?: Date | null;
    lotteryReference?: string | null;
    organizerName?: string | null;
    bankName?: string | null;
    bankAccount?: string | null;
  }): void {
    if (input.name !== undefined) this.currentName = Raffle.normalizeName(input.name);
    if (input.description !== undefined) {
      this.currentDescription = Raffle.normalizeText(input.description);
    }
    if (input.ticketPrice !== undefined) {
      if (!input.ticketPrice.isPositive()) {
        throw new ValidationError('Ticket price must be greater than zero');
      }
      this.currentTicketPrice = input.ticketPrice;
    }
    if (input.drawDate !== undefined) this.currentDrawDate = input.drawDate;
    if (input.lotteryReference !== undefined) {
      this.currentLotteryReference = Raffle.normalizeText(input.lotteryReference);
    }
    this.currentContact = this.mergeContact(input);
  }

  /**
   * Replaces the prize list, carrying winners over by position.
   *
   * Editing the list rebuilds every prize, so without this a raffle that has
   * already been drawn would silently lose which number won each prize.
   */
  replacePrizes(prizes: readonly Prize[]): void {
    const winners = new Map(
      this.currentPrizes
        .filter((prize) => prize.winningNumber !== null)
        .map((prize) => [prize.position, prize.winningNumber]),
    );

    const next = Raffle.validatePrizes(prizes);
    for (const prize of next) {
      const winner = winners.get(prize.position);
      if (prize.winningNumber === null && winner !== undefined) prize.recordWinner(winner);
    }

    this.currentPrizes = next;
  }

  /**
   * Writes down the number that won a prize, or clears it when the draw has to
   * be corrected. The number must belong to the raffle, but it need not be
   * sold: an unsold number can win.
   */
  recordWinner(prizeId: string, number: number | null): Prize {
    const prize = this.currentPrizes.find((candidate) => candidate.id === prizeId);
    if (prize === undefined) throw new PrizeListError(`Prize ${prizeId} is not part of this raffle`);

    if (number !== null && !this.currentRange.contains(number)) {
      throw new TicketNumbersOutOfRangeError(
        [number],
        this.currentRange.min,
        this.currentRange.max,
      );
    }

    prize.recordWinner(number);
    return prize;
  }

  /**
   * Moves the raffle through its lifecycle. A draft can be published and an
   * open raffle can be closed, but closing is one-way: the board of a drawn
   * raffle is a record, and reopening it would let that record change.
   */
  changeStatus(status: RaffleStatus): void {
    if (this.currentStatus === 'closed' && status !== 'closed') {
      throw new ClosedRaffleIsFinalError(this.id);
    }
    if (status === 'closed') this.ensureWinnersAreRecorded();
    this.currentStatus = status;
  }

  /**
   * A raffle closes once it has been drawn, so every prize must already name
   * its number: closing first and filling the winners later would leave the
   * record incomplete with no way back.
   */
  ensureWinnersAreRecorded(): void {
    const pending = this.currentPrizes.filter((prize) => prize.winningNumber === null);
    if (pending.length > 0) {
      throw new MissingPrizeWinnersError(pending.map((prize) => prize.position));
    }
  }

  /** Deleting is only offered from the history, so the raffle has to be there. */
  ensureCanBeDeleted(): void {
    if (this.currentStatus !== 'closed') throw new RaffleNotClosedError(this.id);
  }

  activate(): void {
    this.changeStatus('active');
  }

  close(): void {
    this.changeStatus('closed');
  }

  toSnapshot(): RaffleSnapshot {
    return {
      id: this.id,
      ownerId: this.ownerId,
      name: this.currentName,
      description: this.currentDescription,
      ticketPriceMinorUnits: this.currentTicketPrice.minorUnits,
      currency: this.currentTicketPrice.currency,
      numberMin: this.currentRange.min,
      numberMax: this.currentRange.max,
      numberDigits: this.currentRange.digits,
      drawDate: this.currentDrawDate,
      lotteryReference: this.currentLotteryReference,
      organizerName: this.currentContact.organizerName,
      bankName: this.currentContact.bankName,
      bankAccount: this.currentContact.bankAccount,
      status: this.currentStatus,
      prizes: this.currentPrizes.map((prize) => prize.toSnapshot()),
      createdAt: this.createdAt,
    };
  }

  private static validatePrizes(prizes: readonly Prize[]): Prize[] {
    const positions = new Set<number>();
    for (const prize of prizes) {
      if (positions.has(prize.position)) {
        throw new PrizeListError(`Prize position ${prize.position} is repeated`);
      }
      positions.add(prize.position);
    }
    return [...prizes].sort((a, b) => a.position - b.position);
  }

  private static normalizeName(name: string): string {
    const trimmed = name.trim().replace(/\s+/g, ' ');
    if (trimmed === '') throw new ValidationError('Raffle name cannot be empty');
    return trimmed;
  }

  /** Leaves out what the caller did not send, so a partial edit keeps the rest. */
  private mergeContact(input: ContactInput): OrganizerContact {
    const kept = <K extends keyof OrganizerContact>(key: K): string | null =>
      input[key] === undefined ? this.currentContact[key] : Raffle.normalizeText(input[key]);

    return {
      organizerName: kept('organizerName'),
      bankName: kept('bankName'),
      bankAccount: kept('bankAccount'),
    };
  }

  private static normalizeContact(input: ContactInput): OrganizerContact {
    return {
      organizerName: Raffle.normalizeText(input.organizerName),
      bankName: Raffle.normalizeText(input.bankName),
      bankAccount: Raffle.normalizeText(input.bankAccount),
    };
  }

  private static normalizeText(value: string | null | undefined): string | null {
    const trimmed = value?.trim();
    return trimmed === undefined || trimmed === '' ? null : trimmed;
  }
}
