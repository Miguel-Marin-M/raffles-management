import { index, integer, jsonb, pgTable, timestamp, uuid } from 'drizzle-orm/pg-core';

import { ticketEventTypeEnum } from './enums.js';
import { raffles } from './raffles.js';
import { users } from './users.js';

/**
 * Audit trail per number: who reserved, paid or released it.
 *
 * Stores the raw number instead of a ticket reference because the `tickets`
 * row is deleted on release and the history has to outlive it.
 */
export const ticketEvents = pgTable(
  'ticket_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    raffleId: uuid('raffle_id')
      .notNull()
      .references(() => raffles.id, { onDelete: 'cascade' }),

    number: integer('number').notNull(),
    type: ticketEventTypeEnum('type').notNull(),

    actorId: uuid('actor_id').references(() => users.id, { onDelete: 'set null' }),
    /** Event details: customer, amount, previous values. */
    payload: jsonb('payload').notNull().default({}),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('ticket_events_raffle_id_created_at_idx').on(table.raffleId, table.createdAt),
    index('ticket_events_raffle_id_number_idx').on(table.raffleId, table.number),
  ],
);

export type TicketEventRow = typeof ticketEvents.$inferSelect;
export type NewTicketEventRow = typeof ticketEvents.$inferInsert;
