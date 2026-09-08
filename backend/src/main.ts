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
  app.enableCors({
    origin: config.CORS_ORIGIN,
    credentials: true,
    // Fastify's CORS plugin only allows GET, HEAD and POST by default, which
    // silently blocks every edit at the preflight.
    methods: ['GET', 'HEAD', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  });
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

/**
 * A busy port is the most common way this fails, and a stack trace buries the
 * one thing worth knowing: another instance is already running.
 */
function isPortTaken(error: unknown): boolean {
  return (error as { code?: string } | null)?.code === 'EADDRINUSE';
}

bootstrap().catch((error: unknown) => {
  if (isPortTaken(error)) {
    const port = process.env['API_PORT'] ?? '3000';
    console.error(
      `Port ${port} is already in use. Another API instance is probably still ` +
        `running: close that terminal, or set API_PORT to a free port.`,
    );
  } else {
    console.error('The API failed to start:', error);
  }

  process.exitCode = 1;
});
