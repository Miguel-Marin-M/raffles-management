import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';

import { AuthenticateOrganizer } from '../../application/auth/authenticate-organizer.js';
import { RegisterOrganizer } from '../../application/auth/register-organizer.js';
import { CLOCK } from '../../domain/ports/clock.js';
import { ID_GENERATOR } from '../../domain/ports/id-generator.js';
import { PASSWORD_HASHER } from '../../domain/ports/password-hasher.js';
import { USER_REPOSITORY } from '../../domain/ports/user-repository.js';
import type { Clock } from '../../domain/ports/clock.js';
import type { IdGenerator } from '../../domain/ports/id-generator.js';
import type { PasswordHasher } from '../../domain/ports/password-hasher.js';
import type { UserRepository } from '../../domain/ports/user-repository.js';
import { AuthController } from './auth.controller.js';
import { JwtAuthGuard } from './jwt-auth.guard.js';
import { TokenService } from './token.service.js';

@Module({
  imports: [JwtModule.register({})],
  controllers: [AuthController],
  providers: [
    TokenService,
    JwtAuthGuard,
    {
      provide: RegisterOrganizer,
      useFactory: (
        users: UserRepository,
        hasher: PasswordHasher,
        idGenerator: IdGenerator,
        clock: Clock,
      ) => new RegisterOrganizer(users, hasher, idGenerator, clock),
      inject: [USER_REPOSITORY, PASSWORD_HASHER, ID_GENERATOR, CLOCK],
    },
    {
      provide: AuthenticateOrganizer,
      useFactory: (users: UserRepository, hasher: PasswordHasher) =>
        new AuthenticateOrganizer(users, hasher),
      inject: [USER_REPOSITORY, PASSWORD_HASHER],
    },
  ],
  exports: [JwtAuthGuard, JwtModule],
})
export class AuthModule {}
