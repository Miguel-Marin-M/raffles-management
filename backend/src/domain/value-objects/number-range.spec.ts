import { describe, expect, it } from 'vitest';

import { ValidationError } from '../errors/domain-error.js';
import { NumberRange } from './number-range.js';

describe('NumberRange', () => {
  it('describes the classic 00-99 board', () => {
    const range = NumberRange.twoDigits();

    expect(range.size).toBe(100);
    expect(range.format(0)).toBe('00');
    expect(range.format(7)).toBe('07');
    expect(range.format(99)).toBe('99');
  });

  it('infers the digit count from the highest number', () => {
    expect(NumberRange.create(0, 999).digits).toBe(3);
  });

  it('rejects ranges that do not fit the requested digits', () => {
    expect(() => NumberRange.create(0, 999, 2)).toThrow(ValidationError);
  });

  it('rejects inverted or empty ranges', () => {
    expect(() => NumberRange.create(50, 50)).toThrow(ValidationError);
    expect(() => NumberRange.create(100, 10)).toThrow(ValidationError);
  });

  it('knows which numbers belong to it', () => {
    const range = NumberRange.create(1, 500, 3);

    expect(range.contains(1)).toBe(true);
    expect(range.contains(500)).toBe(true);
    expect(range.contains(0)).toBe(false);
    expect(range.contains(501)).toBe(false);
    expect(range.contains(1.5)).toBe(false);
  });

  it('enumerates every number in order', () => {
    expect([...NumberRange.create(0, 3, 1).values()]).toEqual([0, 1, 2, 3]);
  });
});
