import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService, type JwtSignOptions } from '@nestjs/jwt';

import { API_CONFIG, type ApiConfig } from '../config/api-config.js';
import type { RequestUser } from './current-user.decorator.js';

export interface IssuedTokens {
  readonly accessToken: string;
  readonly refreshToken: string;
}

/**
 * Issues and verifies session tokens.
 *
 * Sessions are a transport concern, so the use cases only decide whether the
 * credentials are valid and this service decides how the session travels.
 */
@Injectable()
export class TokenService {
  constructor(
    private readonly jwtService: JwtService,
    @Inject(API_CONFIG) private readonly config: ApiConfig,
  ) {}

  async issue(user: { id: string; email: string }): Promise<IssuedTokens> {
    const payload = { sub: user.id, email: user.email };
    // Durations come from the environment as plain strings ("15m", "30d"),
    // which jsonwebtoken accepts but types as a narrower literal union.
    const accessTtl = this.config.JWT_ACCESS_TTL as NonNullable<JwtSignOptions['expiresIn']>;
    const refreshTtl = this.config.JWT_REFRESH_TTL as NonNullable<JwtSignOptions['expiresIn']>;

    return {
      accessToken: await this.jwtService.signAsync(payload, {
        secret: this.config.JWT_ACCESS_SECRET,
        expiresIn: accessTtl,
      }),
      refreshToken: await this.jwtService.signAsync(payload, {
        secret: this.config.JWT_REFRESH_SECRET,
        expiresIn: refreshTtl,
      }),
    };
  }

  async verifyRefreshToken(token: string): Promise<RequestUser> {
    try {
      const payload = await this.jwtService.verifyAsync<{ sub: string; email: string }>(token, {
        secret: this.config.JWT_REFRESH_SECRET,
      });
      return { id: payload.sub, email: payload.email };
    } catch {
      throw new UnauthorizedException({
        code: 'INVALID_REFRESH_TOKEN',
        message: 'The session has expired, sign in again',
      });
    }
  }
}
