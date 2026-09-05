import { pgEnum } from 'drizzle-orm/pg-core';

export const raffleStatusEnum = pgEnum('raffle_status', ['draft', 'active', 'closed']);

/** A free number has no row in `tickets`, hence no enum member for it. */
export const ticketStatusEnum = pgEnum('ticket_status', ['reserved', 'paid']);

export const paymentMethodEnum = pgEnum('payment_method', [
  'cash',
  'transfer',
  'card',
  'other',
]);

export const ticketEventTypeEnum = pgEnum('ticket_event_type', [
  'reserved',
  'payment_registered',
  'paid',
  'released',
  'reassigned',
  'updated',
]);
