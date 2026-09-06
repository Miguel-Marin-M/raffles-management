import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';

import { ChangeRaffleStatus } from '../../application/raffles/change-raffle-status.js';
import { CreateRaffle } from '../../application/raffles/create-raffle.js';
import { DeleteRaffle } from '../../application/raffles/delete-raffle.js';
import { GetRaffleBoard } from '../../application/raffles/get-raffle-board.js';
import { ListRaffles } from '../../application/raffles/list-raffles.js';
import { RecordPrizeWinner } from '../../application/raffles/record-prize-winner.js';
import { UpdateRaffle } from '../../application/raffles/update-raffle.js';
import { CurrentUser, type RequestUser } from '../auth/current-user.decorator.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { ZodValidationPipe } from '../pipes/zod-validation.pipe.js';

const prizeSchema = z.object({
  title: z.string().min(1),
  description: z.string().nullish(),
});

const createRaffleSchema = z.object({
  name: z.string().min(1),
  description: z.string().nullish(),
  ticketPriceMinorUnits: z.number().int().positive(),
  currency: z.string().length(3).optional(),
  numberMin: z.number().int().min(0).optional(),
  numberMax: z.number().int().positive().optional(),
  numberDigits: z.number().int().min(1).max(6).optional(),
  drawDate: z.iso.datetime().nullish(),
  lotteryReference: z.string().nullish(),
  prizes: z.array(prizeSchema).optional(),
  status: z.enum(['draft', 'active', 'closed']).optional(),
});

const updateRaffleSchema = createRaffleSchema
  .omit({ currency: true, numberMin: true, numberMax: true, numberDigits: true, status: true })
  .partial();

const statusSchema = z.object({ status: z.enum(['draft', 'active', 'closed']) });

const winnerSchema = z.object({ number: z.number().int().min(0).nullable() });

@ApiTags('raffles')
@Controller('raffles')
@UseGuards(JwtAuthGuard)
export class RafflesController {
  constructor(
    private readonly listRaffles: ListRaffles,
    private readonly createRaffle: CreateRaffle,
    private readonly updateRaffle: UpdateRaffle,
    private readonly changeRaffleStatus: ChangeRaffleStatus,
    private readonly getRaffleBoard: GetRaffleBoard,
    private readonly recordPrizeWinner: RecordPrizeWinner,
    private readonly deleteRaffle: DeleteRaffle,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List the raffles of the signed-in organizer' })
  list(@CurrentUser() user: RequestUser) {
    return this.listRaffles.execute({ actorId: user.id });
  }

  @Post()
  @ApiOperation({ summary: 'Create a raffle with its prize list' })
  create(
    @CurrentUser() user: RequestUser,
    @Body(new ZodValidationPipe(createRaffleSchema)) body: z.infer<typeof createRaffleSchema>,
  ) {
    const { drawDate, ...rest } = body;
    return this.createRaffle.execute({
      ...rest,
      actorId: user.id,
      drawDate: drawDate == null ? null : new Date(drawDate),
    });
  }

  @Get(':raffleId')
  @ApiOperation({ summary: 'Read a raffle with its board and totals' })
  board(@CurrentUser() user: RequestUser, @Param('raffleId') raffleId: string) {
    return this.getRaffleBoard.execute({ actorId: user.id, raffleId });
  }

  @Patch(':raffleId')
  @ApiOperation({ summary: 'Edit raffle details or replace its prize list' })
  update(
    @CurrentUser() user: RequestUser,
    @Param('raffleId') raffleId: string,
    @Body(new ZodValidationPipe(updateRaffleSchema)) body: z.infer<typeof updateRaffleSchema>,
  ) {
    const { drawDate, ...rest } = body;
    return this.updateRaffle.execute({
      ...rest,
      actorId: user.id,
      raffleId,
      ...(drawDate === undefined ? {} : { drawDate: drawDate === null ? null : new Date(drawDate) }),
    });
  }

  @Patch(':raffleId/prizes/:prizeId/winner')
  @ApiOperation({ summary: 'Write down the number that won a prize' })
  recordWinner(
    @CurrentUser() user: RequestUser,
    @Param('raffleId') raffleId: string,
    @Param('prizeId') prizeId: string,
    @Body(new ZodValidationPipe(winnerSchema)) body: z.infer<typeof winnerSchema>,
  ) {
    return this.recordPrizeWinner.execute({
      actorId: user.id,
      raffleId,
      prizeId,
      number: body.number,
    });
  }

  @Patch(':raffleId/status')
  @ApiOperation({ summary: 'Publish, close or reopen a raffle' })
  changeStatus(
    @CurrentUser() user: RequestUser,
    @Param('raffleId') raffleId: string,
    @Body(new ZodValidationPipe(statusSchema)) body: z.infer<typeof statusSchema>,
  ) {
    return this.changeRaffleStatus.execute({ actorId: user.id, raffleId, status: body.status });
  }

  @Delete(':raffleId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a closed raffle from the history' })
  async remove(
    @CurrentUser() user: RequestUser,
    @Param('raffleId') raffleId: string,
  ): Promise<void> {
    await this.deleteRaffle.execute({ actorId: user.id, raffleId });
  }
}
