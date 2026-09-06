import { Module } from '@nestjs/common';

import { CustomerResolver } from '../../application/customers/customer-resolver.js';
import { MarkTicketsAsPaid } from '../../application/tickets/mark-tickets-as-paid.js';
import { ReassignTickets } from '../../application/tickets/reassign-tickets.js';
import { RegisterPayment } from '../../application/tickets/register-payment.js';
import { ReleaseTickets } from '../../application/tickets/release-tickets.js';
import { ReserveTickets } from '../../application/tickets/reserve-tickets.js';
import { CLOCK, type Clock } from '../../domain/ports/clock.js';
import { ID_GENERATOR, type IdGenerator } from '../../domain/ports/id-generator.js';
import { UNIT_OF_WORK, type UnitOfWork } from '../../domain/ports/unit-of-work.js';
import { AuthModule } from '../auth/auth.module.js';
import { TicketsController } from './tickets.controller.js';

@Module({
  imports: [AuthModule],
  controllers: [TicketsController],
  providers: [
    {
      provide: CustomerResolver,
      useFactory: (idGenerator: IdGenerator, clock: Clock) =>
        new CustomerResolver(idGenerator, clock),
      inject: [ID_GENERATOR, CLOCK],
    },
    {
      provide: ReserveTickets,
      useFactory: (
        unitOfWork: UnitOfWork,
        customerResolver: CustomerResolver,
        idGenerator: IdGenerator,
        clock: Clock,
      ) => new ReserveTickets(unitOfWork, customerResolver, idGenerator, clock),
      inject: [UNIT_OF_WORK, CustomerResolver, ID_GENERATOR, CLOCK],
    },
    {
      provide: MarkTicketsAsPaid,
      useFactory: (unitOfWork: UnitOfWork, idGenerator: IdGenerator, clock: Clock) =>
        new MarkTicketsAsPaid(unitOfWork, idGenerator, clock),
      inject: [UNIT_OF_WORK, ID_GENERATOR, CLOCK],
    },
    {
      provide: RegisterPayment,
      useFactory: (unitOfWork: UnitOfWork, idGenerator: IdGenerator, clock: Clock) =>
        new RegisterPayment(unitOfWork, idGenerator, clock),
      inject: [UNIT_OF_WORK, ID_GENERATOR, CLOCK],
    },
    {
      provide: ReassignTickets,
      useFactory: (unitOfWork: UnitOfWork, customerResolver: CustomerResolver) =>
        new ReassignTickets(unitOfWork, customerResolver),
      inject: [UNIT_OF_WORK, CustomerResolver],
    },
    {
      provide: ReleaseTickets,
      useFactory: (unitOfWork: UnitOfWork) => new ReleaseTickets(unitOfWork),
      inject: [UNIT_OF_WORK],
    },
  ],
})
export class TicketsModule {}
