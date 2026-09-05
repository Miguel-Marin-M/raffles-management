import { ValidationError } from '../errors/domain-error.js';
import { EmailAddress } from '../value-objects/email-address.js';

export interface UserSnapshot {
  readonly id: string;
  readonly email: string;
  readonly passwordHash: string;
  readonly name: string;
  readonly createdAt: Date;
}

/** Organizer account. Buyers are customers and never get one. */
export class User {
  private constructor(
    readonly id: string,
    readonly email: EmailAddress,
    private currentPasswordHash: string,
    private currentName: string,
    readonly createdAt: Date,
  ) {}

  static register(input: {
    id: string;
    email: string;
    passwordHash: string;
    name: string;
    createdAt: Date;
  }): User {
    const name = input.name.trim().replace(/\s+/g, ' ');
    if (name === '') throw new ValidationError('Name cannot be empty');

    return new User(
      input.id,
      EmailAddress.create(input.email),
      input.passwordHash,
      name,
      input.createdAt,
    );
  }

  static restore(snapshot: UserSnapshot): User {
    return new User(
      snapshot.id,
      EmailAddress.create(snapshot.email),
      snapshot.passwordHash,
      snapshot.name,
      snapshot.createdAt,
    );
  }

  get passwordHash(): string {
    return this.currentPasswordHash;
  }

  get name(): string {
    return this.currentName;
  }

  changePassword(passwordHash: string): void {
    this.currentPasswordHash = passwordHash;
  }

  toSnapshot(): UserSnapshot {
    return {
      id: this.id,
      email: this.email.value,
      passwordHash: this.currentPasswordHash,
      name: this.currentName,
      createdAt: this.createdAt,
    };
  }
}
