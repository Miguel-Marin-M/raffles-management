/**
 * Source of the current time.
 *
 * Injected instead of calling `new Date()` inside use cases so that tests can
 * assert on timestamps without freezing the system clock.
 */
export interface Clock {
  now(): Date;
}

export const CLOCK = Symbol('Clock');
