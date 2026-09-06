import { index, integer, pgTable, text, timestamp, unique, uuid } from 'drizzle-orm/pg-core';

import { raffles } from './raffles.js';

/**
 * Raffle prize. Organizers add as many as they need; `position` orders them
 * (first prize, second prize, and so on).
 */
export const prizes = pgTable(
  'prizes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    raffleId: uuid('raffle_id')
      .notNull()
      .references(() => raffles.id, { onDelete: 'cascade' }),

    position: integer('position').notNull(),
    title: text('title').notNull(),
    description: text('description'),
    /** Number drawn for this prize; null until the raffle is played. */
    winningNumber: integer('winning_number'),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('prizes_raffle_id_idx').on(table.raffleId),
    unique('prizes_raffle_id_position_unique').on(table.raffleId, table.position),
  ],
);

export type PrizeRow = typeof prizes.$inferSelect;
export type NewPrizeRow = typeof prizes.$inferInsert;
