import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';

import { SearchCustomers } from '../../application/customers/search-customers.js';
import { CurrentUser, type RequestUser } from '../auth/current-user.decorator.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';

@ApiTags('customers')
@Controller('customers')
@UseGuards(JwtAuthGuard)
export class CustomersController {
  constructor(private readonly searchCustomers: SearchCustomers) {}

  @Get()
  @ApiOperation({ summary: 'Look up customers by name or phone' })
  @ApiQuery({ name: 'q', required: false })
  search(@CurrentUser() user: RequestUser, @Query('q') term?: string) {
    return this.searchCustomers.execute({ actorId: user.id, term: term ?? '' });
  }
}
