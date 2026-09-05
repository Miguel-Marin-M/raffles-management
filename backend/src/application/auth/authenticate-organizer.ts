import { InvalidCredentialsError } from '../../domain/errors/auth-errors.js';
import type { PasswordHasher } from '../../domain/ports/password-hasher.js';
import type { UserRepository } from '../../domain/ports/user-repository.js';
import type { AuthenticatedUser } from './register-organizer.js';

export interface AuthenticateOrganizerCommand {
  readonly email: string;
  readonly password: string;
}

/**
 * Verifies credentials and returns the account behind them.
 *
 * Issuing tokens is left to the transport layer: the rule this use case owns
 * is whether the password matches, not how a session is represented.
 */
export class AuthenticateOrganizer {
  constructor(
    private readonly users: UserRepository,
    private readonly passwordHasher: PasswordHasher,
  ) {}

  async execute(command: AuthenticateOrganizerCommand): Promise<AuthenticatedUser> {
    const user = await this.users.findByEmail(command.email.trim().toLowerCase());
    if (user === null) throw new InvalidCredentialsError();

    const matches = await this.passwordHasher.verify(command.password, user.passwordHash);
    if (!matches) throw new InvalidCredentialsError();

    return { id: user.id, email: user.email.value, name: user.name };
  }
}
