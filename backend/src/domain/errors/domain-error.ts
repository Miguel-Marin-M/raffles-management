/**
 * Base class for every rule violation expressed by the domain.
 *
 * Carrying a stable `code` lets the HTTP layer map failures to status codes
 * without inspecting messages or importing concrete error classes.
 */
export abstract class DomainError extends Error {
  abstract readonly code: string;

  protected constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

/** Input that cannot produce a valid value object or entity. */
export class ValidationError extends DomainError {
  readonly code = 'VALIDATION_ERROR';

  constructor(message: string) {
    super(message);
  }
}
