import { sql } from 'drizzle-orm';
import {
  bigint,
  check,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';

import { raffleStatusEnum } from './enums.js';
import { users } from './users.js';

/**
 * A raffle, its ticket price and the range of numbers being drawn.
 *
 * The range is configurable (00-99, 000-999 or any other), and `numberDigits`
 * drives the zero padding used when rendering the board.
 */
export const raffles = pgTable(
  'raffles',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    ownerId: uuid('owner_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),

    name: text('name').notNull(),
    description: text('description'),

    /** Minor currency units, to keep money out of floating point. */
    ticketPriceCents: bigint('ticket_price_cents', { mode: 'number' }).notNull(),
    currency: text('currency').notNull().default('COP'),

    numberMin: integer('number_min').notNull().default(0),
    numberMax: integer('number_max').notNull().default(99),
    numberDigits: integer('number_digits').notNull().default(2),

    drawDate: timestamp('draw_date', { withTimezone: true }),
    /** Lottery draw the winning number is taken from. */
    lotteryReference: text('lottery_reference'),

    /**
     * Contact details printed on the poster. Optional, and kept per raffle
     * rather than on the account because an organizer may run a raffle on
     * behalf of someone else or collect it in a different account.
     */
    organizerName: text('organizer_name'),
    bankName: text('bank_name'),
    bankAccount: text('bank_account'),

    status: raffleStatusEnum('status').notNull().default('draft'),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('raffles_owner_id_idx').on(table.ownerId),
    index('raffles_owner_id_status_idx').on(table.ownerId, table.status),
    check('raffles_ticket_price_positive', sql`${table.ticketPriceCents} > 0`),
    check(
      'raffles_number_range_valid',
      sql`${table.numberMin} >= 0 and ${table.numberMax} > ${table.numberMin}`,
    ),
    check(
      'raffles_number_digits_valid',
      sql`${table.numberDigits} between 1 and 6`,
    ),
  ],
);

export type RaffleRow = typeof raffles.$inferSelect;
export type NewRaffleRow = typeof raffles.$inferInsert;
