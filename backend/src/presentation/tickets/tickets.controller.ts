import { Body, Controller, HttpCode, HttpStatus, Param, Post, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';

import { MarkTicketsAsPaid } from '../../application/tickets/mark-tickets-as-paid.js';
import { ReassignTickets } from '../../application/tickets/reassign-tickets.js';
import { RegisterPayment } from '../../application/tickets/register-payment.js';
import { ReleaseTickets } from '../../application/tickets/release-tickets.js';
import { ReserveTickets } from '../../application/tickets/reserve-tickets.js';
import { CurrentUser, type RequestUser } from '../auth/current-user.decorator.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { ZodValidationPipe } from '../pipes/zod-validation.pipe.js';

const numbersSchema = z.array(z.number().int().min(0)).min(1);
const paymentMethodSchema = z.enum(['cash', 'transfer', 'card', 'other']);

/** Either an existing customer or the data to register one while reserving. */
const customerSchema = z.union([
  z.object({ id: z.uuid() }),
  z.object({
    name: z.string().min(1),
    phone: z.string().nullish(),
    notes: z.string().nullish(),
  }),
]);

const reserveSchema = z.object({
  numbers: numbersSchema,
  customer: customerSchema,
  notes: z.string().nullish(),
});

const markAsPaidSchema = z.object({
  numbers: numbersSchema,
  method: paymentMethodSchema.optional(),
  note: z.string().nullish(),
});

const releaseSchema = z.object({
  numbers: numbersSchema,
  reason: z.string().nullish(),
});

const reassignSchema = z.object({ numbers: numbersSchema, customer: customerSchema });

const paymentSchema = z.object({
  amountMinorUnits: z.number().int().positive(),
  method: paymentMethodSchema.optional(),
  note: z.string().nullish(),
});

@ApiTags('tickets')
@Controller()
@UseGuards(JwtAuthGuard)
export class TicketsController {
  constructor(
    private readonly reserveTickets: ReserveTickets,
    private readonly markTicketsAsPaid: MarkTicketsAsPaid,
    private readonly releaseTickets: ReleaseTickets,
    private readonly registerPayment: RegisterPayment,
    private readonly reassignTickets: ReassignTickets,
  ) {}

  @Post('raffles/:raffleId/tickets/reserve')
  @ApiOperation({ summary: 'Reserve numbers for a customer' })
  reserve(
    @CurrentUser() user: RequestUser,
    @Param('raffleId') raffleId: string,
    @Body(new ZodValidationPipe(reserveSchema)) body: z.infer<typeof reserveSchema>,
  ) {
    return this.reserveTickets.execute({
      actorId: user.id,
      raffleId,
      numbers: body.numbers,
      customer: body.customer,
      notes: body.notes ?? null,
    });
  }

  @Post('raffles/:raffleId/tickets/paid')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Settle the outstanding balance of a selection' })
  markAsPaid(
    @CurrentUser() user: RequestUser,
    @Param('raffleId') raffleId: string,
    @Body(new ZodValidationPipe(markAsPaidSchema)) body: z.infer<typeof markAsPaidSchema>,
  ) {
    return this.markTicketsAsPaid.execute({
      actorId: user.id,
      raffleId,
      numbers: body.numbers,
      ...(body.method === undefined ? {} : { method: body.method }),
      note: body.note ?? null,
    });
  }

  @Post('raffles/:raffleId/tickets/release')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Put numbers back on the market' })
  release(
    @CurrentUser() user: RequestUser,
    @Param('raffleId') raffleId: string,
    @Body(new ZodValidationPipe(releaseSchema)) body: z.infer<typeof releaseSchema>,
  ) {
    return this.releaseTickets.execute({
      actorId: user.id,
      raffleId,
      numbers: body.numbers,
      reason: body.reason ?? null,
    });
  }

  @Post('raffles/:raffleId/tickets/reassign')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Hand reserved numbers over to another customer' })
  reassign(
    @CurrentUser() user: RequestUser,
    @Param('raffleId') raffleId: string,
    @Body(new ZodValidationPipe(reassignSchema)) body: z.infer<typeof reassignSchema>,
  ) {
    return this.reassignTickets.execute({
      actorId: user.id,
      raffleId,
      numbers: body.numbers,
      customer: body.customer,
    });
  }

  @Post('tickets/:ticketId/payments')
  @ApiOperation({ summary: 'Record a payment or instalment on one ticket' })
  pay(
    @CurrentUser() user: RequestUser,
    @Param('ticketId') ticketId: string,
    @Body(new ZodValidationPipe(paymentSchema)) body: z.infer<typeof paymentSchema>,
  ) {
    return this.registerPayment.execute({
      actorId: user.id,
      ticketId,
      amountMinorUnits: body.amountMinorUnits,
      ...(body.method === undefined ? {} : { method: body.method }),
      note: body.note ?? null,
    });
  }
}
