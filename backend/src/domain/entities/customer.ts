import { ValidationError } from '../errors/domain-error.js';
import { PhoneNumber } from '../value-objects/phone-number.js';

export interface CustomerSnapshot {
  readonly id: string;
  readonly ownerId: string;
  readonly name: string;
  readonly phone: string | null;
  readonly notes: string | null;
  readonly createdAt: Date;
}

/**
 * Buyer tracked by an organizer. Belongs to the organizer rather than to a
 * raffle, so the same person can be reused across raffles.
 */
export class Customer {
  private constructor(
    readonly id: string,
    readonly ownerId: string,
    private currentName: string,
    private currentPhone: PhoneNumber | null,
    private currentNotes: string | null,
    readonly createdAt: Date,
  ) {}

  static create(input: {
    id: string;
    ownerId: string;
    name: string;
    phone?: string | null;
    notes?: string | null;
    createdAt: Date;
  }): Customer {
    return new Customer(
      input.id,
      input.ownerId,
      Customer.normalizeName(input.name),
      PhoneNumber.createOptional(input.phone),
      Customer.normalizeNotes(input.notes),
      input.createdAt,
    );
  }

  static restore(snapshot: CustomerSnapshot): Customer {
    return new Customer(
      snapshot.id,
      snapshot.ownerId,
      snapshot.name,
      snapshot.phone === null ? null : PhoneNumber.create(snapshot.phone),
      snapshot.notes,
      snapshot.createdAt,
    );
  }

  get name(): string {
    return this.currentName;
  }

  get phone(): PhoneNumber | null {
    return this.currentPhone;
  }

  get notes(): string | null {
    return this.currentNotes;
  }

  rename(name: string): void {
    this.currentName = Customer.normalizeName(name);
  }

  changePhone(phone: string | null): void {
    this.currentPhone = PhoneNumber.createOptional(phone);
  }

  changeNotes(notes: string | null): void {
    this.currentNotes = Customer.normalizeNotes(notes);
  }

  toSnapshot(): CustomerSnapshot {
    return {
      id: this.id,
      ownerId: this.ownerId,
      name: this.currentName,
      phone: this.currentPhone?.value ?? null,
      notes: this.currentNotes,
      createdAt: this.createdAt,
    };
  }

  private static normalizeName(name: string): string {
    const trimmed = name.trim().replace(/\s+/g, ' ');
    if (trimmed === '') throw new ValidationError('Customer name cannot be empty');
    return trimmed;
  }

  private static normalizeNotes(notes: string | null | undefined): string | null {
    const trimmed = notes?.trim();
    return trimmed === undefined || trimmed === '' ? null : trimmed;
  }
}
