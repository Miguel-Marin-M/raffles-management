import type { User } from '../entities/user.js';

export interface UserRepository {
  findById(userId: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  save(user: User): Promise<void>;
}

export const USER_REPOSITORY = Symbol('UserRepository');
