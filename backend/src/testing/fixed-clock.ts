import type { Clock } from '../domain/ports/clock.js';

/** Clock that only moves when a test tells it to. */
export class FixedClock implements Clock {
  constructor(private current: Date = new Date('2026-01-01T00:00:00Z')) {}

  now(): Date {
    return this.current;
  }

  set(date: Date): void {
    this.current = date;
  }

  advanceMinutes(minutes: number): void {
    this.current = new Date(this.current.getTime() + minutes * 60_000);
  }
}
