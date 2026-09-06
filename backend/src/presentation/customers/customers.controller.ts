import { Body, Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';

import { SearchCustomers } from '../../application/customers/search-customers.js';
import { UpdateCustomer } from '../../application/customers/update-customer.js';
import { CurrentUser, type RequestUser } from '../auth/current-user.decorator.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { ZodValidationPipe } from '../pipes/zod-validation.pipe.js';

const updateCustomerSchema = z.object({
  name: z.string().min(1).optional(),
  phone: z.string().nullish(),
  notes: z.string().nullish(),
});

@ApiTags('customers')
@Controller('customers')
@UseGuards(JwtAuthGuard)
export class CustomersController {
  constructor(
    private readonly searchCustomers: SearchCustomers,
    private readonly updateCustomer: UpdateCustomer,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Look up customers by name or phone' })
  @ApiQuery({ name: 'q', required: false })
  @ApiQuery({ name: 'raffleId', required: false })
  search(
    @CurrentUser() user: RequestUser,
    @Query('q') term?: string,
    @Query('raffleId') raffleId?: string,
  ) {
    return this.searchCustomers.execute({
      actorId: user.id,
      term: term ?? '',
      ...(raffleId === undefined ? {} : { raffleId }),
    });
  }

  @Patch(':customerId')
  @ApiOperation({ summary: 'Complete the details of a customer already on file' })
  update(
    @CurrentUser() user: RequestUser,
    @Param('customerId') customerId: string,
    @Body(new ZodValidationPipe(updateCustomerSchema)) body: z.infer<typeof updateCustomerSchema>,
  ) {
    return this.updateCustomer.execute({ ...body, actorId: user.id, customerId });
  }
}
