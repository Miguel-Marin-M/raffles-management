import { sql } from 'drizzle-orm';
import {
  bigint,
  check,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';

import { customers } from './customers.js';
import { ticketStatusEnum } from './enums.js';
import { raffles } from './raffles.js';
import { users } from './users.js';

/**
 * A reserved or paid ticket.
 *
 * Rows exist only for taken numbers: a free number is the absence of a row.
 * A 1000-number raffle therefore starts empty, and releasing a ticket is a
 * delete, with the history kept in `ticket_events`.
 *
 * The (raffle_id, number) unique constraint is what makes double reservation
 * impossible, including when two devices reserve the same number at once.
 */
export const tickets = pgTable(
  'tickets',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    raffleId: uuid('raffle_id')
      .notNull()
      .references(() => raffles.id, { onDelete: 'cascade' }),

    number: integer('number').notNull(),

    customerId: uuid('customer_id')
      .notNull()
      .references(() => customers.id, { onDelete: 'restrict' }),

    status: ticketStatusEnum('status').notNull().default('reserved'),
    /**
     * Credit currently sitting on this ticket. Usually the sum of its
     * `payments`, except when an instalment is moved to the numbers the
     * customer finally plays.
     */
    amountPaidCents: bigint('amount_paid_cents', { mode: 'number' }).notNull().default(0),
    notes: text('notes'),

    reservedAt: timestamp('reserved_at', { withTimezone: true }).notNull().defaultNow(),
    paidAt: timestamp('paid_at', { withTimezone: true }),

    createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),

    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique('tickets_raffle_id_number_unique').on(table.raffleId, table.number),
    index('tickets_raffle_id_status_idx').on(table.raffleId, table.status),
    index('tickets_customer_id_idx').on(table.customerId),
    check('tickets_number_non_negative', sql`${table.number} >= 0`),
    check('tickets_amount_paid_non_negative', sql`${table.amountPaidCents} >= 0`),
    check(
      'tickets_paid_at_matches_status',
      sql`(${table.status} = 'paid') = (${table.paidAt} is not null)`,
    ),
  ],
);

export type TicketRow = typeof tickets.$inferSelect;
export type NewTicketRow = typeof tickets.$inferInsert;
