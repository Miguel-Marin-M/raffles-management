import { ValidationError } from '../errors/domain-error.js';

const DEFAULT_CURRENCY = 'COP';

/**
 * A non-negative amount stored in minor currency units.
 *
 * Amounts never touch floating point: every operation stays on integers, which
 * is what the database columns hold as well.
 */
export class Money {
  private constructor(
    readonly minorUnits: number,
    readonly currency: string,
  ) {}

  static fromMinorUnits(minorUnits: number, currency: string = DEFAULT_CURRENCY): Money {
    if (!Number.isSafeInteger(minorUnits)) {
      throw new ValidationError(`Amount must be a safe integer, received ${minorUnits}`);
    }
    if (minorUnits < 0) {
      throw new ValidationError(`Amount cannot be negative, received ${minorUnits}`);
    }
    if (!/^[A-Z]{3}$/.test(currency)) {
      throw new ValidationError(`Currency must be a 3-letter ISO code, received "${currency}"`);
    }
    return new Money(minorUnits, currency);
  }

  static zero(currency: string = DEFAULT_CURRENCY): Money {
    return Money.fromMinorUnits(0, currency);
  }

  add(other: Money): Money {
    this.assertSameCurrency(other);
    return Money.fromMinorUnits(this.minorUnits + other.minorUnits, this.currency);
  }

  subtract(other: Money): Money {
    this.assertSameCurrency(other);
    return Money.fromMinorUnits(this.minorUnits - other.minorUnits, this.currency);
  }

  multiply(factor: number): Money {
    if (!Number.isSafeInteger(factor) || factor < 0) {
      throw new ValidationError(`Factor must be a non-negative integer, received ${factor}`);
    }
    return Money.fromMinorUnits(this.minorUnits * factor, this.currency);
  }

  isZero(): boolean {
    return this.minorUnits === 0;
  }

  isPositive(): boolean {
    return this.minorUnits > 0;
  }

  isLessThan(other: Money): boolean {
    this.assertSameCurrency(other);
    return this.minorUnits < other.minorUnits;
  }

  isGreaterThan(other: Money): boolean {
    this.assertSameCurrency(other);
    return this.minorUnits > other.minorUnits;
  }

  isAtLeast(other: Money): boolean {
    this.assertSameCurrency(other);
    return this.minorUnits >= other.minorUnits;
  }

  equals(other: Money): boolean {
    return this.currency === other.currency && this.minorUnits === other.minorUnits;
  }

  private assertSameCurrency(other: Money): void {
    if (this.currency !== other.currency) {
      throw new ValidationError(
        `Cannot operate on ${this.currency} and ${other.currency} amounts`,
      );
    }
  }
}
