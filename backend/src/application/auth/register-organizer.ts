import { User } from '../../domain/entities/user.js';
import { EmailAlreadyRegisteredError } from '../../domain/errors/auth-errors.js';
import { ValidationError } from '../../domain/errors/domain-error.js';
import type { Clock } from '../../domain/ports/clock.js';
import type { IdGenerator } from '../../domain/ports/id-generator.js';
import type { PasswordHasher } from '../../domain/ports/password-hasher.js';
import type { UserRepository } from '../../domain/ports/user-repository.js';
import { EmailAddress } from '../../domain/value-objects/email-address.js';

const MIN_PASSWORD_LENGTH = 8;

export interface RegisterOrganizerCommand {
  readonly email: string;
  readonly password: string;
  readonly name: string;
}

export interface AuthenticatedUser {
  readonly id: string;
  readonly email: string;
  readonly name: string;
}

/** Creates an organizer account. */
export class RegisterOrganizer {
  constructor(
    private readonly users: UserRepository,
    private readonly passwordHasher: PasswordHasher,
    private readonly idGenerator: IdGenerator,
    private readonly clock: Clock,
  ) {}

  async execute(command: RegisterOrganizerCommand): Promise<AuthenticatedUser> {
    if (command.password.length < MIN_PASSWORD_LENGTH) {
      throw new ValidationError(
        `Password must be at least ${MIN_PASSWORD_LENGTH} characters long`,
      );
    }

    const email = EmailAddress.create(command.email);
    const existing = await this.users.findByEmail(email.value);
    if (existing !== null) throw new EmailAlreadyRegisteredError(email.value);

    const user = User.register({
      id: this.idGenerator.generate(),
      email: email.value,
      passwordHash: await this.passwordHasher.hash(command.password),
      name: command.name,
      createdAt: this.clock.now(),
    });

    await this.users.save(user);
    return { id: user.id, email: user.email.value, name: user.name };
  }
}
