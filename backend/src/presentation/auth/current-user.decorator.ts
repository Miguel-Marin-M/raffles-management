import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';

export interface RequestUser {
  readonly id: string;
  readonly email: string;
}

/** Injects the organizer behind the request, as established by JwtAuthGuard. */
export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): RequestUser => {
    const request = context.switchToHttp().getRequest<FastifyRequest & { user?: RequestUser }>();
    if (request.user === undefined) {
      throw new Error('CurrentUser used on a route that is not behind JwtAuthGuard');
    }
    return request.user;
  },
);
