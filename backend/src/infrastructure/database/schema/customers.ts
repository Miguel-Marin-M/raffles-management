import { index, pgTable, text, timestamp, unique, uuid } from 'drizzle-orm/pg-core';

import { users } from './users.js';

/**
 * Buyer who reserves tickets. Has no account: it is a record the organizer
 * keeps in order to know who still owes money.
 *
 * Owned by the organizer rather than by a raffle, so the same customer can be
 * reused across raffles.
 */
export const customers = pgTable(
  'customers',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    ownerId: uuid('owner_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),

    name: text('name').notNull(),
    /** Normalized to digits only so the uniqueness constraint is reliable. */
    phone: text('phone'),
    notes: text('notes'),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('customers_owner_id_idx').on(table.ownerId),
    // NULLs do not collide in Postgres, so several customers may have no phone.
    unique('customers_owner_id_phone_unique').on(table.ownerId, table.phone),
  ],
);

export type CustomerRow = typeof customers.$inferSelect;
export type NewCustomerRow = typeof customers.$inferInsert;
