import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres, { type Sql } from 'postgres';

import { readDatabaseConfig, type DatabaseConfig } from './config.js';
import * as schema from './schema/index.js';

export type Database = PostgresJsDatabase<typeof schema>;

export interface DatabaseConnection {
  readonly db: Database;
  readonly sql: Sql;
  close(): Promise<void>;
}

/**
 * Opens a PostgreSQL connection.
 *
 * Deliberately a factory rather than an exported singleton: callers own the
 * lifecycle (the API registers it in its DI container, scripts open and close
 * it), which keeps the connection swappable in tests.
 */
export function createDatabaseConnection(
  config: DatabaseConfig = readDatabaseConfig(),
): DatabaseConnection {
  const sql = postgres(config.url, {
    max: config.maxConnections,
    ssl: config.ssl ? 'require' : false,
    // Transaction-mode poolers reject prepared statements.
    prepare: !config.ssl,
    // Server notices ("relation already exists, skipping") are bookkeeping,
    // not application events, and printing them makes migrations look broken.
    onnotice: () => {},
  });

  const db = drizzle(sql, { schema, casing: 'snake_case' });

  return {
    db,
    sql,
    close: async () => {
      await sql.end({ timeout: 5 });
    },
  };
}
