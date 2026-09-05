import { hash, verify } from '@node-rs/argon2';

import type { PasswordHasher } from '../../domain/ports/password-hasher.js';

/**
 * Argon2id hashing with the parameters recommended by OWASP for interactive
 * logins: 19 MiB of memory, two iterations and one lane.
 */
export class Argon2PasswordHasher implements PasswordHasher {
  private readonly options = { memoryCost: 19_456, timeCost: 2, parallelism: 1 };

  async hash(plainPassword: string): Promise<string> {
    return hash(plainPassword, this.options);
  }

  async verify(plainPassword: string, passwordHash: string): Promise<boolean> {
    try {
      return await verify(passwordHash, plainPassword, this.options);
    } catch {
      // A malformed stored hash must read as "wrong password", never as a crash.
      return false;
    }
  }
}
