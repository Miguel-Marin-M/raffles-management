import { InvalidCredentialsError } from '../../domain/errors/auth-errors.js';
import type { UserRepository } from '../../domain/ports/user-repository.js';
import type { AuthenticatedUser } from './register-organizer.js';

/**
 * Reads the account behind a session.
 *
 * The token only carries the identifier, so the display name is looked up
 * here and a renamed organizer sees the change without signing in again.
 */
export class GetOrganizerProfile {
  constructor(private readonly users: UserRepository) {}

  async execute(input: { actorId: string }): Promise<AuthenticatedUser> {
    const user = await this.users.findById(input.actorId);
    // The token verified but the account is gone: treat it as no session.
    if (user === null) throw new InvalidCredentialsError();

    return { id: user.id, email: user.email.value, name: user.name };
  }
}
