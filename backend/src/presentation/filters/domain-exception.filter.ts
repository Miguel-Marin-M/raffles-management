import { Catch, HttpStatus, type ArgumentsHost, type ExceptionFilter } from '@nestjs/common';
import type { FastifyReply } from 'fastify';

import { DomainError } from '../../domain/errors/domain-error.js';

/**
 * Translates domain errors into HTTP responses.
 *
 * Mapping by code keeps controllers free of try/catch and gives the client a
 * stable contract: the code is what the UI branches on, the message is only
 * for humans.
 */
const STATUS_BY_CODE: Record<string, HttpStatus> = {
  VALIDATION_ERROR: HttpStatus.BAD_REQUEST,
  INVALID_CREDENTIALS: HttpStatus.UNAUTHORIZED,
  EMAIL_ALREADY_REGISTERED: HttpStatus.CONFLICT,
  RAFFLE_NOT_FOUND: HttpStatus.NOT_FOUND,
  // Reported as not found so the existence of another organizer's raffle stays hidden.
  RAFFLE_ACCESS_DENIED: HttpStatus.NOT_FOUND,
  RAFFLE_CLOSED: HttpStatus.CONFLICT,
  CLOSED_RAFFLE_IS_FINAL: HttpStatus.CONFLICT,
  RAFFLE_NOT_CLOSED: HttpStatus.CONFLICT,
  MISSING_PRIZE_WINNERS: HttpStatus.CONFLICT,
  INVALID_PRIZE_LIST: HttpStatus.BAD_REQUEST,
  CUSTOMER_NOT_FOUND: HttpStatus.NOT_FOUND,
  DUPLICATE_CUSTOMER_PHONE: HttpStatus.CONFLICT,
  TICKET_NOT_FOUND: HttpStatus.NOT_FOUND,
  TICKETS_ALREADY_TAKEN: HttpStatus.CONFLICT,
  TICKET_NUMBERS_NOT_RESERVED: HttpStatus.CONFLICT,
  TICKET_NUMBERS_OUT_OF_RANGE: HttpStatus.BAD_REQUEST,
  EMPTY_TICKET_SELECTION: HttpStatus.BAD_REQUEST,
  TICKET_ALREADY_PAID: HttpStatus.CONFLICT,
  TICKET_HAS_PAYMENTS: HttpStatus.CONFLICT,
  PAID_TICKET_IS_FINAL: HttpStatus.CONFLICT,
  PAYMENT_EXCEEDS_OUTSTANDING: HttpStatus.BAD_REQUEST,
};

@Catch(DomainError)
export class DomainExceptionFilter implements ExceptionFilter<DomainError> {
  catch(error: DomainError, host: ArgumentsHost): void {
    const reply = host.switchToHttp().getResponse<FastifyReply>();
    const status = STATUS_BY_CODE[error.code] ?? HttpStatus.UNPROCESSABLE_ENTITY;

    void reply.status(status).send({
      code: error.code,
      message: error.message,
      ...this.detailsOf(error),
    });
  }

  /**
   * Surfaces what the client needs to act on the conflict: the numbers a board
   * should highlight, or the customer a duplicate phone belongs to.
   */
  private detailsOf(error: DomainError): Record<string, unknown> {
    const { numbers, customerId, customerName } = error as {
      numbers?: readonly number[];
      customerId?: string;
      customerName?: string;
    };

    return {
      ...(numbers === undefined ? {} : { numbers }),
      ...(customerId === undefined ? {} : { customerId }),
      ...(customerName === undefined ? {} : { customerName }),
    };
  }
}
