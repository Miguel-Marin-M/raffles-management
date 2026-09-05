import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { FastifyRequest } from 'fastify';

import { API_CONFIG, type ApiConfig } from '../config/api-config.js';
import type { RequestUser } from './current-user.decorator.js';

interface AccessTokenPayload {
  readonly sub: string;
  readonly email: string;
}

/** Rejects any request without a valid access token. */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    @Inject(API_CONFIG) private readonly config: ApiConfig,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<FastifyRequest & { user?: RequestUser }>();
    const header = request.headers.authorization;
    if (header === undefined || !header.startsWith('Bearer ')) {
      throw new UnauthorizedException({ code: 'UNAUTHENTICATED', message: 'Missing access token' });
    }

    try {
      const payload = await this.jwtService.verifyAsync<AccessTokenPayload>(header.slice(7), {
        secret: this.config.JWT_ACCESS_SECRET,
      });
      request.user = { id: payload.sub, email: payload.email };
      return true;
    } catch {
      throw new UnauthorizedException({ code: 'UNAUTHENTICATED', message: 'Invalid access token' });
    }
  }
}
