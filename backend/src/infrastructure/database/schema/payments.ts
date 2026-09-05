import { sql } from 'drizzle-orm';
import { bigint, check, index, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

import { paymentMethodEnum } from './enums.js';
import { tickets } from './tickets.js';
import { users } from './users.js';

/**
 * Payment against a ticket. Partial payments are allowed: a ticket becomes
 * paid once its payments cover the raffle ticket price.
 */
export const payments = pgTable(
  'payments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    ticketId: uuid('ticket_id')
      .notNull()
      .references(() => tickets.id, { onDelete: 'cascade' }),

    amountCents: bigint('amount_cents', { mode: 'number' }).notNull(),
    method: paymentMethodEnum('method').notNull().default('cash'),
    note: text('note'),

    paidAt: timestamp('paid_at', { withTimezone: true }).notNull().defaultNow(),
    createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('payments_ticket_id_idx').on(table.ticketId),
    check('payments_amount_positive', sql`${table.amountCents} > 0`),
  ],
);

export type PaymentRow = typeof payments.$inferSelect;
export type NewPaymentRow = typeof payments.$inferInsert;
