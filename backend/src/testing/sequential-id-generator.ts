import type { IdGenerator } from '../domain/ports/id-generator.js';

/** Predictable identifiers, so assertions can name the entities they expect. */
export class SequentialIdGenerator implements IdGenerator {
  private next = 1;

  constructor(private readonly prefix = 'id') {}

  generate(): string {
    const id = `${this.prefix}-${this.next}`;
    this.next += 1;
    return id;
  }
}
