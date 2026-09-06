import { Body, Controller, Get, HttpCode, HttpStatus, Post, Req, Res, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
// Side-effect import: augments FastifyRequest/FastifyReply with the cookie API.
import '@fastify/cookie';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';

import { AuthenticateOrganizer } from '../../application/auth/authenticate-organizer.js';
import { GetOrganizerProfile } from '../../application/auth/get-organizer-profile.js';
import { RegisterOrganizer } from '../../application/auth/register-organizer.js';
import { ZodValidationPipe } from '../pipes/zod-validation.pipe.js';
import { CurrentUser, type RequestUser } from './current-user.decorator.js';
import { JwtAuthGuard } from './jwt-auth.guard.js';
import { TokenService } from './token.service.js';

const REFRESH_COOKIE = 'rifas_refresh';

const registerSchema = z.object({
  name: z.string().min(1),
  email: z.email(),
  password: z.string().min(8),
});

const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
});

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly registerOrganizer: RegisterOrganizer,
    private readonly authenticateOrganizer: AuthenticateOrganizer,
    private readonly getOrganizerProfile: GetOrganizerProfile,
    private readonly tokens: TokenService,
  ) {}

  @Post('register')
  @ApiOperation({ summary: 'Create an organizer account' })
  async register(
    @Body(new ZodValidationPipe(registerSchema)) body: z.infer<typeof registerSchema>,
    @Res({ passthrough: true }) reply: FastifyReply,
  ) {
    const user = await this.registerOrganizer.execute(body);
    return this.respondWithSession(user, reply);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Sign in with email and password' })
  async login(
    @Body(new ZodValidationPipe(loginSchema)) body: z.infer<typeof loginSchema>,
    @Res({ passthrough: true }) reply: FastifyReply,
  ) {
    const user = await this.authenticateOrganizer.execute(body);
    return this.respondWithSession(user, reply);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Exchange the refresh cookie for a new access token' })
  async refresh(
    @Req() request: FastifyRequest,
    @Res({ passthrough: true }) reply: FastifyReply,
  ) {
    const cookie = request.cookies[REFRESH_COOKIE] ?? '';
    const user = await this.tokens.verifyRefreshToken(cookie);
    return this.respondWithSession(user, reply);
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Clear the session cookie' })
  logout(@Res({ passthrough: true }) reply: FastifyReply): void {
    void reply.clearCookie(REFRESH_COOKIE, { path: '/' });
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Return the signed-in organizer' })
  me(@CurrentUser() user: RequestUser) {
    return this.getOrganizerProfile.execute({ actorId: user.id });
  }

  /**
   * The refresh token travels in an httpOnly cookie so page scripts cannot
   * read it; the short-lived access token is returned for the client to hold
   * in memory.
   */
  private async respondWithSession(
    user: { id: string; email: string; name?: string },
    reply: FastifyReply,
  ) {
    const { accessToken, refreshToken } = await this.tokens.issue(user);

    void reply.setCookie(REFRESH_COOKIE, refreshToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env['NODE_ENV'] === 'production',
      path: '/',
    });

    return { accessToken, user: { id: user.id, email: user.email, name: user.name ?? null } };
  }
}
