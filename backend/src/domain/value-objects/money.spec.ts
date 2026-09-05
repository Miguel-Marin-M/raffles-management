import { describe, expect, it } from 'vitest';

import { ValidationError } from '../errors/domain-error.js';
import { Money } from './money.js';

describe('Money', () => {
  it('rejects negative and fractional amounts', () => {
    expect(() => Money.fromMinorUnits(-1)).toThrow(ValidationError);
    expect(() => Money.fromMinorUnits(10.5)).toThrow(ValidationError);
  });

  it('rejects currencies that are not ISO codes', () => {
    expect(() => Money.fromMinorUnits(100, 'cop')).toThrow(ValidationError);
  });

  it('adds and subtracts within the same currency', () => {
    const price = Money.fromMinorUnits(10_000);
    const paid = Money.fromMinorUnits(4_000);

    expect(price.subtract(paid).minorUnits).toBe(6_000);
    expect(paid.add(paid).minorUnits).toBe(8_000);
  });

  it('refuses to mix currencies', () => {
    const cop = Money.fromMinorUnits(1_000, 'COP');
    const usd = Money.fromMinorUnits(1_000, 'USD');

    expect(() => cop.add(usd)).toThrow(ValidationError);
  });

  it('multiplies by a ticket count', () => {
    expect(Money.fromMinorUnits(10_000).multiply(4).minorUnits).toBe(40_000);
  });

  it('compares amounts', () => {
    const price = Money.fromMinorUnits(10_000);

    expect(Money.fromMinorUnits(10_000).isAtLeast(price)).toBe(true);
    expect(Money.fromMinorUnits(9_999).isAtLeast(price)).toBe(false);
    expect(Money.zero().isZero()).toBe(true);
  });
});
