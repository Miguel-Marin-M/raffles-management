import { Module } from '@nestjs/common';

import { ChangeRaffleStatus } from '../../application/raffles/change-raffle-status.js';
import { CreateRaffle } from '../../application/raffles/create-raffle.js';
import { DeleteRaffle } from '../../application/raffles/delete-raffle.js';
import { GetRaffleBoard } from '../../application/raffles/get-raffle-board.js';
import { ListRaffles } from '../../application/raffles/list-raffles.js';
import { RecordPrizeWinner } from '../../application/raffles/record-prize-winner.js';
import { UpdateRaffle } from '../../application/raffles/update-raffle.js';
import { CLOCK, type Clock } from '../../domain/ports/clock.js';
import {
  CUSTOMER_REPOSITORY,
  type CustomerRepository,
} from '../../domain/ports/customer-repository.js';
import { ID_GENERATOR, type IdGenerator } from '../../domain/ports/id-generator.js';
import { RAFFLE_REPOSITORY, type RaffleRepository } from '../../domain/ports/raffle-repository.js';
import { TICKET_REPOSITORY, type TicketRepository } from '../../domain/ports/ticket-repository.js';
import { AuthModule } from '../auth/auth.module.js';
import { RafflesController } from './raffles.controller.js';

@Module({
  imports: [AuthModule],
  controllers: [RafflesController],
  providers: [
    {
      provide: ListRaffles,
      useFactory: (raffles: RaffleRepository) => new ListRaffles(raffles),
      inject: [RAFFLE_REPOSITORY],
    },
    {
      provide: CreateRaffle,
      useFactory: (raffles: RaffleRepository, idGenerator: IdGenerator, clock: Clock) =>
        new CreateRaffle(raffles, idGenerator, clock),
      inject: [RAFFLE_REPOSITORY, ID_GENERATOR, CLOCK],
    },
    {
      provide: UpdateRaffle,
      useFactory: (raffles: RaffleRepository, idGenerator: IdGenerator) =>
        new UpdateRaffle(raffles, idGenerator),
      inject: [RAFFLE_REPOSITORY, ID_GENERATOR],
    },
    {
      provide: ChangeRaffleStatus,
      useFactory: (raffles: RaffleRepository) => new ChangeRaffleStatus(raffles),
      inject: [RAFFLE_REPOSITORY],
    },
    {
      provide: DeleteRaffle,
      useFactory: (raffles: RaffleRepository) => new DeleteRaffle(raffles),
      inject: [RAFFLE_REPOSITORY],
    },
    {
      provide: RecordPrizeWinner,
      useFactory: (raffles: RaffleRepository, tickets: TicketRepository) =>
        new RecordPrizeWinner(raffles, tickets),
      inject: [RAFFLE_REPOSITORY, TICKET_REPOSITORY],
    },
    {
      provide: GetRaffleBoard,
      useFactory: (
        raffles: RaffleRepository,
        tickets: TicketRepository,
        customers: CustomerRepository,
      ) => new GetRaffleBoard(raffles, tickets, customers),
      inject: [RAFFLE_REPOSITORY, TICKET_REPOSITORY, CUSTOMER_REPOSITORY],
    },
  ],
})
export class RafflesModule {}
