import { relations } from 'drizzle-orm';

import { customers } from './customers.js';
import { payments } from './payments.js';
import { prizes } from './prizes.js';
import { raffles } from './raffles.js';
import { ticketEvents } from './ticket-events.js';
import { tickets } from './tickets.js';
import { users } from './users.js';

export const usersRelations = relations(users, ({ many }) => ({
  raffles: many(raffles),
  customers: many(customers),
}));

export const rafflesRelations = relations(raffles, ({ one, many }) => ({
  owner: one(users, { fields: [raffles.ownerId], references: [users.id] }),
  prizes: many(prizes),
  tickets: many(tickets),
  events: many(ticketEvents),
}));

export const prizesRelations = relations(prizes, ({ one }) => ({
  raffle: one(raffles, { fields: [prizes.raffleId], references: [raffles.id] }),
}));

export const customersRelations = relations(customers, ({ one, many }) => ({
  owner: one(users, { fields: [customers.ownerId], references: [users.id] }),
  tickets: many(tickets),
}));

export const ticketsRelations = relations(tickets, ({ one, many }) => ({
  raffle: one(raffles, { fields: [tickets.raffleId], references: [raffles.id] }),
  customer: one(customers, { fields: [tickets.customerId], references: [customers.id] }),
  payments: many(payments),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  ticket: one(tickets, { fields: [payments.ticketId], references: [tickets.id] }),
}));

export const ticketEventsRelations = relations(ticketEvents, ({ one }) => ({
  raffle: one(raffles, { fields: [ticketEvents.raffleId], references: [raffles.id] }),
  actor: one(users, { fields: [ticketEvents.actorId], references: [users.id] }),
}));
