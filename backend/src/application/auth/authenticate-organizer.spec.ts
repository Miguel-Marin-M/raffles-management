import { beforeEach, describe, expect, it } from 'vitest';

import {
  EmailAlreadyRegisteredError,
  InvalidCredentialsError,
} from '../../domain/errors/auth-errors.js';
import { ValidationError } from '../../domain/errors/domain-error.js';
import { FixedClock } from '../../testing/fixed-clock.js';
import {
  FakePasswordHasher,
  InMemoryUserRepository,
} from '../../testing/in-memory/in-memory-user-repository.js';
import { SequentialIdGenerator } from '../../testing/sequential-id-generator.js';
import { AuthenticateOrganizer } from './authenticate-organizer.js';
import { RegisterOrganizer } from './register-organizer.js';

const CREDENTIALS = { email: 'ana@rifas.co', password: 'una-clave-larga' };

describe('organizer authentication', () => {
  let users: InMemoryUserRepository;
  let register: RegisterOrganizer;
  let authenticate: AuthenticateOrganizer;

  beforeEach(() => {
    users = new InMemoryUserRepository();
    const hasher = new FakePasswordHasher();

    register = new RegisterOrganizer(
      users,
      hasher,
      new SequentialIdGenerator('user'),
      new FixedClock(new Date('2026-03-06T10:00:00Z')),
    );
    authenticate = new AuthenticateOrganizer(users, hasher);
  });

  it('registers an account and lets it sign in', async () => {
    const registered = await register.execute({ ...CREDENTIALS, name: 'Ana Torres' });
    const authenticated = await authenticate.execute(CREDENTIALS);

    expect(authenticated.id).toBe(registered.id);
    expect(authenticated.email).toBe('ana@rifas.co');
  });

  it('normalizes the email so casing does not create a second account', async () => {
    await register.execute({ ...CREDENTIALS, email: 'Ana@Rifas.CO', name: 'Ana Torres' });

    await expect(
      register.execute({ ...CREDENTIALS, name: 'Ana Torres' }),
    ).rejects.toThrow(EmailAlreadyRegisteredError);
    expect(users.size).toBe(1);
  });

  it('signs in regardless of how the email was typed', async () => {
    await register.execute({ ...CREDENTIALS, name: 'Ana Torres' });

    const authenticated = await authenticate.execute({
      ...CREDENTIALS,
      email: '  ANA@rifas.co ',
    });

    expect(authenticated.name).toBe('Ana Torres');
  });

  it('rejects a short password', async () => {
    await expect(
      register.execute({ email: 'otra@rifas.co', password: 'corta', name: 'Otra' }),
    ).rejects.toThrow(ValidationError);
  });

  it('rejects a wrong password', async () => {
    await register.execute({ ...CREDENTIALS, name: 'Ana Torres' });

    await expect(
      authenticate.execute({ ...CREDENTIALS, password: 'otra-clave-larga' }),
    ).rejects.toThrow(InvalidCredentialsError);
  });

  it('does not reveal whether the email exists', async () => {
    await expect(
      authenticate.execute({ email: 'nadie@rifas.co', password: 'una-clave-larga' }),
    ).rejects.toThrow(InvalidCredentialsError);
  });
});
