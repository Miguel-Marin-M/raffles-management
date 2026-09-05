/** Keeps the hashing algorithm out of the domain and the use cases. */
export interface PasswordHasher {
  hash(plainPassword: string): Promise<string>;
  verify(plainPassword: string, passwordHash: string): Promise<boolean>;
}

export const PASSWORD_HASHER = Symbol('PasswordHasher');
