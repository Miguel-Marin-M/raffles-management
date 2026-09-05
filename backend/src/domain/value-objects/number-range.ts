import { ValidationError } from '../errors/domain-error.js';

/** Guards against ranges large enough to make board rendering unusable. */
const MAX_TICKETS = 100_000;
const MAX_DIGITS = 6;

export interface NumberRangeSnapshot {
  readonly min: number;
  readonly max: number;
  readonly digits: number;
}

/**
 * The inclusive range of numbers a raffle draws from, plus the zero padding
 * used to display them (two digits for a 00-99 board, three for 000-999).
 */
export class NumberRange {
  private constructor(
    readonly min: number,
    readonly max: number,
    readonly digits: number,
  ) {}

  static create(min: number, max: number, digits?: number): NumberRange {
    if (!Number.isInteger(min) || min < 0) {
      throw new ValidationError(`Range start must be a non-negative integer, received ${min}`);
    }
    if (!Number.isInteger(max) || max <= min) {
      throw new ValidationError(`Range end must be an integer greater than ${min}, received ${max}`);
    }
    if (max - min + 1 > MAX_TICKETS) {
      throw new ValidationError(`A raffle cannot hold more than ${MAX_TICKETS} numbers`);
    }

    const resolvedDigits = digits ?? String(max).length;
    if (!Number.isInteger(resolvedDigits) || resolvedDigits < 1 || resolvedDigits > MAX_DIGITS) {
      throw new ValidationError(`Digits must be between 1 and ${MAX_DIGITS}, received ${digits}`);
    }
    if (max >= 10 ** resolvedDigits) {
      throw new ValidationError(`${max} does not fit in ${resolvedDigits} digits`);
    }

    return new NumberRange(min, max, resolvedDigits);
  }

  /** The classic 00-99 board. */
  static twoDigits(): NumberRange {
    return NumberRange.create(0, 99, 2);
  }

  get size(): number {
    return this.max - this.min + 1;
  }

  contains(value: number): boolean {
    return Number.isInteger(value) && value >= this.min && value <= this.max;
  }

  /** Zero-padded representation, the one shown on the board. */
  format(value: number): string {
    return String(value).padStart(this.digits, '0');
  }

  *values(): IterableIterator<number> {
    for (let value = this.min; value <= this.max; value += 1) yield value;
  }

  toSnapshot(): NumberRangeSnapshot {
    return { min: this.min, max: this.max, digits: this.digits };
  }

  equals(other: NumberRange): boolean {
    return this.min === other.min && this.max === other.max && this.digits === other.digits;
  }
}
