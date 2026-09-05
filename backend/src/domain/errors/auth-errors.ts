import { DomainError } from './domain-error.js';

export class EmailAlreadyRegisteredError extends DomainError {
  readonly code = 'EMAIL_ALREADY_REGISTERED';

  constructor(readonly email: string) {
    super(`${email} is already registered`);
  }
}

/**
 * Raised for both an unknown email and a wrong password: telling them apart
 * would let anyone probe which accounts exist.
 */
export class InvalidCredentialsError extends DomainError {
  readonly code = 'INVALID_CREDENTIALS';

  constructor() {
    super('Invalid email or password');
  }
}
