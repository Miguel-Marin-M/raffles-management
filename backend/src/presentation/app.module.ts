import { Module } from '@nestjs/common';

import { AuthModule } from './auth/auth.module.js';
import { CustomersModule } from './customers/customers.module.js';
import { CoreModule } from './modules/core.module.js';
import { RafflesModule } from './raffles/raffles.module.js';
import { TicketsModule } from './tickets/tickets.module.js';

@Module({
  imports: [CoreModule, AuthModule, RafflesModule, TicketsModule, CustomersModule],
})
export class AppModule {}
