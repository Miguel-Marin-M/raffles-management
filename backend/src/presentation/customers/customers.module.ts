import { Module } from '@nestjs/common';

import { SearchCustomers } from '../../application/customers/search-customers.js';
import {
  CUSTOMER_REPOSITORY,
  type CustomerRepository,
} from '../../domain/ports/customer-repository.js';
import { AuthModule } from '../auth/auth.module.js';
import { CustomersController } from './customers.controller.js';

@Module({
  imports: [AuthModule],
  controllers: [CustomersController],
  providers: [
    {
      provide: SearchCustomers,
      useFactory: (customers: CustomerRepository) => new SearchCustomers(customers),
      inject: [CUSTOMER_REPOSITORY],
    },
  ],
})
export class CustomersModule {}
