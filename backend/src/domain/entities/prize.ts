import { ValidationError } from '../errors/domain-error.js';

export interface PrizeSnapshot {
  readonly id: string;
  readonly position: number;
  readonly title: string;
  readonly description: string | null;
}

/**
 * One prize of a raffle. Organizers add as many as they want, and `position`
 * orders them: 1 is the main prize.
 */
export class Prize {
  private constructor(
    readonly id: string,
    readonly position: number,
    readonly title: string,
    readonly description: string | null,
  ) {}

  static create(input: {
    id: string;
    position: number;
    title: string;
    description?: string | null;
  }): Prize {
    const title = input.title.trim();
    if (title === '') throw new ValidationError('Prize title cannot be empty');
    if (!Number.isInteger(input.position) || input.position < 1) {
      throw new ValidationError(`Prize position must be a positive integer, received ${input.position}`);
    }

    const description = input.description?.trim();
    return new Prize(input.id, input.position, title, description === '' || description === undefined ? null : description);
  }

  static restore(snapshot: PrizeSnapshot): Prize {
    return new Prize(snapshot.id, snapshot.position, snapshot.title, snapshot.description);
  }

  toSnapshot(): PrizeSnapshot {
    return {
      id: this.id,
      position: this.position,
      title: this.title,
      description: this.description,
    };
  }
}
