import { eq } from 'drizzle-orm';

import { User } from '../../domain/entities/user.js';
import type { UserRepository } from '../../domain/ports/user-repository.js';
import { users } from '../database/schema/index.js';
import type { UserRow } from '../database/schema/index.js';
import type { DrizzleExecutor } from './drizzle-executor.js';

function toUser(row: UserRow): User {
  return User.restore({
    id: row.id,
    email: row.email,
    passwordHash: row.passwordHash,
    name: row.name,
    createdAt: row.createdAt,
  });
}

export class DrizzleUserRepository implements UserRepository {
  constructor(private readonly db: DrizzleExecutor) {}

  async findById(userId: string): Promise<User | null> {
    const row = await this.db.query.users.findFirst({ where: eq(users.id, userId) });
    return row === undefined ? null : toUser(row);
  }

  async findByEmail(email: string): Promise<User | null> {
    const row = await this.db.query.users.findFirst({ where: eq(users.email, email) });
    return row === undefined ? null : toUser(row);
  }

  async save(user: User): Promise<void> {
    const snapshot = user.toSnapshot();
    const values = {
      id: snapshot.id,
      email: snapshot.email,
      passwordHash: snapshot.passwordHash,
      name: snapshot.name,
      createdAt: snapshot.createdAt,
      updatedAt: new Date(),
    };

    await this.db
      .insert(users)
      .values(values)
      .onConflictDoUpdate({ target: users.id, set: values });
  }
}
