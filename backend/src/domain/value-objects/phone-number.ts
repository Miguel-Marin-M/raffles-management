import { ValidationError } from '../errors/domain-error.js';

const MIN_DIGITS = 7;
const MAX_DIGITS = 15;

/**
 * Contact number for a customer, normalized to digits so that lookups and the
 * per-organizer uniqueness constraint do not depend on formatting.
 */
export class PhoneNumber {
  private constructor(readonly value: string) {}

  static create(raw: string): PhoneNumber {
    const digits = raw.replace(/\D/g, '');
    if (digits.length < MIN_DIGITS || digits.length > MAX_DIGITS) {
      throw new ValidationError(`"${raw}" is not a valid phone number`);
    }
    return new PhoneNumber(digits);
  }

  /** Returns null for blank input, since the phone is optional. */
  static createOptional(raw: string | null | undefined): PhoneNumber | null {
    if (raw === null || raw === undefined || raw.trim() === '') return null;
    return PhoneNumber.create(raw);
  }

  equals(other: PhoneNumber): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
