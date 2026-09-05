import { randomUUID } from 'node:crypto';

import type { IdGenerator } from '../../domain/ports/id-generator.js';

/** UUIDv4 from the platform, matching the uuid columns of the schema. */
export class UuidIdGenerator implements IdGenerator {
  generate(): string {
    return randomUUID();
  }
}
