import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import '../../load-env.js';

import { migrate } from 'drizzle-orm/postgres-js/migrator';

import { createDatabaseConnection } from './client.js';
import { readDatabaseConfig } from './config.js';

const migrationsFolder = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  '..',
  'drizzle',
);

async function main(): Promise<void> {
  // A single connection keeps concurrent runs serialized behind the migration lock.
  const config = { ...readDatabaseConfig(), maxConnections: 1 };
  const connection = createDatabaseConnection(config);

  try {
    console.log('Running migrations...');
    await migrate(connection.db, { migrationsFolder });
    console.log('Migrations applied.');
  } finally {
    await connection.close();
  }
}

main().catch((error: unknown) => {
  console.error('Migration failed:', error);
  process.exitCode = 1;
});
