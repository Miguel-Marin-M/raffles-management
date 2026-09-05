import { User, type UserSnapshot } from '../../domain/entities/user.js';
import type { PasswordHasher } from '../../domain/ports/password-hasher.js';
import type { UserRepository } from '../../domain/ports/user-repository.js';

export class InMemoryUserRepository implements UserRepository {
  private readonly users = new Map<string, UserSnapshot>();

  async findById(userId: string): Promise<User | null> {
    const snapshot = this.users.get(userId);
    return snapshot === undefined ? null : User.restore(snapshot);
  }

  async findByEmail(email: string): Promise<User | null> {
    const match = [...this.users.values()].find((user) => user.email === email);
    return match === undefined ? null : User.restore(match);
  }

  async save(user: User): Promise<void> {
    this.users.set(user.id, user.toSnapshot());
  }

  get size(): number {
    return this.users.size;
  }
}

/** Reversible stand-in for argon2, fast enough to run in every test. */
export class FakePasswordHasher implements PasswordHasher {
  async hash(plainPassword: string): Promise<string> {
    return `hashed:${plainPassword}`;
  }

  async verify(plainPassword: string, passwordHash: string): Promise<boolean> {
    return passwordHash === `hashed:${plainPassword}`;
  }
}
