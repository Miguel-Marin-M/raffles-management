/** Produces identifiers for new entities, keeping uuid libraries out of the domain. */
export interface IdGenerator {
  generate(): string;
}

export const ID_GENERATOR = Symbol('IdGenerator');
