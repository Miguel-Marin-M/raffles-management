import { and, eq, ilike, inArray, or } from 'drizzle-orm';

import { Customer } from '../../domain/entities/customer.js';
import type { CustomerRepository } from '../../domain/ports/customer-repository.js';
import { customers } from '../database/schema/index.js';
import type { CustomerRow } from '../database/schema/index.js';
import type { DrizzleExecutor } from './drizzle-executor.js';

function toCustomer(row: CustomerRow): Customer {
  return Customer.restore({
    id: row.id,
    ownerId: row.ownerId,
    name: row.name,
    phone: row.phone,
    notes: row.notes,
    createdAt: row.createdAt,
  });
}

export class DrizzleCustomerRepository implements CustomerRepository {
  constructor(private readonly db: DrizzleExecutor) {}

  async findById(customerId: string): Promise<Customer | null> {
    const row = await this.db.query.customers.findFirst({
      where: eq(customers.id, customerId),
    });
    return row === undefined ? null : toCustomer(row);
  }

  async findManyByIds(customerIds: readonly string[]): Promise<Customer[]> {
    if (customerIds.length === 0) return [];

    const rows = await this.db.query.customers.findMany({
      where: inArray(customers.id, [...customerIds]),
    });
    return rows.map((row) => toCustomer(row));
  }

  async findByPhone(ownerId: string, phone: string): Promise<Customer | null> {
    const row = await this.db.query.customers.findFirst({
      where: and(eq(customers.ownerId, ownerId), eq(customers.phone, phone)),
    });
    return row === undefined ? null : toCustomer(row);
  }

  async search(ownerId: string, term: string, limit: number): Promise<Customer[]> {
    const pattern = `%${term.trim()}%`;
    const rows = await this.db.query.customers.findMany({
      where: and(
        eq(customers.ownerId, ownerId),
        or(ilike(customers.name, pattern), ilike(customers.phone, pattern)),
      ),
      orderBy: customers.name,
      limit,
    });
    return rows.map((row) => toCustomer(row));
  }

  async save(customer: Customer): Promise<void> {
    const snapshot = customer.toSnapshot();
    const values = {
      id: snapshot.id,
      ownerId: snapshot.ownerId,
      name: snapshot.name,
      phone: snapshot.phone,
      notes: snapshot.notes,
      createdAt: snapshot.createdAt,
      updatedAt: new Date(),
    };

    await this.db
      .insert(customers)
      .values(values)
      .onConflictDoUpdate({ target: customers.id, set: values });
  }
}
