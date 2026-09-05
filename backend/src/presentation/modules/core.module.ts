import { Global, Inject, Module, type OnApplicationShutdown } from '@nestjs/common';

import { CLOCK } from '../../domain/ports/clock.js';
import { CUSTOMER_REPOSITORY } from '../../domain/ports/customer-repository.js';
import { ID_GENERATOR } from '../../domain/ports/id-generator.js';
import { PASSWORD_HASHER } from '../../domain/ports/password-hasher.js';
import { PAYMENT_REPOSITORY } from '../../domain/ports/payment-repository.js';
import { RAFFLE_REPOSITORY } from '../../domain/ports/raffle-repository.js';
import { TICKET_REPOSITORY } from '../../domain/ports/ticket-repository.js';
import { UNIT_OF_WORK } from '../../domain/ports/unit-of-work.js';
import { USER_REPOSITORY } from '../../domain/ports/user-repository.js';
import { Argon2PasswordHasher } from '../../infrastructure/auth/argon2-password-hasher.js';
import {
  createDatabaseConnection,
  type Database,
  type DatabaseConnection,
} from '../../infrastructure/database/client.js';
import { DrizzleCustomerRepository } from '../../infrastructure/persistence/drizzle-customer.repository.js';
import { DrizzlePaymentRepository } from '../../infrastructure/persistence/drizzle-payment.repository.js';
import { DrizzleRaffleRepository } from '../../infrastructure/persistence/drizzle-raffle.repository.js';
import { DrizzleTicketRepository } from '../../infrastructure/persistence/drizzle-ticket.repository.js';
import { DrizzleUnitOfWork } from '../../infrastructure/persistence/drizzle-unit-of-work.js';
import { DrizzleUserRepository } from '../../infrastructure/persistence/drizzle-user.repository.js';
import { SystemClock } from '../../infrastructure/system/system-clock.js';
import { UuidIdGenerator } from '../../infrastructure/system/uuid-id-generator.js';
import { API_CONFIG, readApiConfig } from '../config/api-config.js';

export const DATABASE_CONNECTION = Symbol('DatabaseConnection');
export const DATABASE = Symbol('Database');

/**
 * Composition root: the only place that decides which implementation stands
 * behind each port.
 *
 * Use cases receive their collaborators as plain constructor arguments, so
 * swapping PostgreSQL for another store, or argon2 for another hasher, is an
 * edit here and nowhere else.
 */
@Global()
@Module({
  providers: [
    { provide: API_CONFIG, useFactory: () => readApiConfig() },
    { provide: DATABASE_CONNECTION, useFactory: () => createDatabaseConnection() },
    {
      provide: DATABASE,
      useFactory: (connection: DatabaseConnection) => connection.db,
      inject: [DATABASE_CONNECTION],
    },
    { provide: CLOCK, useClass: SystemClock },
    { provide: ID_GENERATOR, useClass: UuidIdGenerator },
    { provide: PASSWORD_HASHER, useClass: Argon2PasswordHasher },
    {
      provide: UNIT_OF_WORK,
      useFactory: (db: Database) => new DrizzleUnitOfWork(db),
      inject: [DATABASE],
    },
    {
      provide: RAFFLE_REPOSITORY,
      useFactory: (db: Database) => new DrizzleRaffleRepository(db),
      inject: [DATABASE],
    },
    {
      provide: TICKET_REPOSITORY,
      useFactory: (db: Database) => new DrizzleTicketRepository(db),
      inject: [DATABASE],
    },
    {
      provide: CUSTOMER_REPOSITORY,
      useFactory: (db: Database) => new DrizzleCustomerRepository(db),
      inject: [DATABASE],
    },
    {
      provide: PAYMENT_REPOSITORY,
      useFactory: (db: Database) => new DrizzlePaymentRepository(db),
      inject: [DATABASE],
    },
    {
      provide: USER_REPOSITORY,
      useFactory: (db: Database) => new DrizzleUserRepository(db),
      inject: [DATABASE],
    },
  ],
  exports: [
    API_CONFIG,
    DATABASE,
    CLOCK,
    ID_GENERATOR,
    PASSWORD_HASHER,
    UNIT_OF_WORK,
    RAFFLE_REPOSITORY,
    TICKET_REPOSITORY,
    CUSTOMER_REPOSITORY,
    PAYMENT_REPOSITORY,
    USER_REPOSITORY,
  ],
})
export class CoreModule implements OnApplicationShutdown {
  constructor(
    @Inject(DATABASE_CONNECTION) private readonly connection: DatabaseConnection,
  ) {}

  async onApplicationShutdown(): Promise<void> {
    await this.connection.close();
  }
}
