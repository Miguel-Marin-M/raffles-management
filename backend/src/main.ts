// Nest reads constructor metadata emitted by the decorators, which requires
// this polyfill to be loaded before any decorated class.
import 'reflect-metadata';

import './load-env.js';

import fastifyCookie from '@fastify/cookie';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

import { readApiConfig } from './presentation/config/api-config.js';
import { DomainExceptionFilter } from './presentation/filters/domain-exception.filter.js';
import { AppModule } from './presentation/app.module.js';

async function bootstrap(): Promise<void> {
  const config = readApiConfig();

  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
  );

  await app.register(fastifyCookie);
  app.setGlobalPrefix(config.API_PREFIX);
  app.useGlobalFilters(new DomainExceptionFilter());
  app.enableCors({ origin: config.CORS_ORIGIN, credentials: true });
  app.enableShutdownHooks();

  SwaggerModule.setup(
    `${config.API_PREFIX}/docs`,
    app,
    SwaggerModule.createDocument(
      app,
      new DocumentBuilder()
        .setTitle('Rifas API')
        .setDescription('Raffle management for organizers')
        .setVersion('0.1.0')
        .addBearerAuth()
        .build(),
    ),
  );

  await app.listen({ port: config.API_PORT, host: '0.0.0.0' });
  console.log(`API listening on http://localhost:${config.API_PORT}/${config.API_PREFIX}`);
}

bootstrap().catch((error: unknown) => {
  console.error('The API failed to start:', error);
  process.exitCode = 1;
});
