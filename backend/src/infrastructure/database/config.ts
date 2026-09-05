/**
 * Connection settings resolved from the environment.
 *
 * Every database access goes through DATABASE_URL, so pointing the system at a
 * managed provider is an environment change rather than a code change.
 */
export interface DatabaseConfig {
  readonly url: string;
  readonly ssl: boolean;
  readonly maxConnections: number;
}

export class MissingDatabaseUrlError extends Error {
  constructor() {
    super('DATABASE_URL is not set');
    this.name = 'MissingDatabaseUrlError';
  }
}

const TRUTHY = new Set(['1', 'true', 'yes', 'on', 'require']);

const MANAGED_PROVIDER_HOST = /sslmode=require|supabase\.|neon\.tech|render\.com/i;

/** Managed providers require TLS; the local container does not. */
function inferSsl(url: string, raw: string | undefined): boolean {
  if (raw !== undefined && raw !== '') return TRUTHY.has(raw.toLowerCase());
  return MANAGED_PROVIDER_HOST.test(url);
}

export function readDatabaseConfig(env: NodeJS.ProcessEnv = process.env): DatabaseConfig {
  const url = env['DATABASE_URL'];
  if (url === undefined || url.trim() === '') throw new MissingDatabaseUrlError();

  const parsedMax = Number.parseInt(env['DB_MAX_CONNECTIONS'] ?? '', 10);

  return {
    url,
    ssl: inferSsl(url, env['DB_SSL']),
    maxConnections: Number.isFinite(parsedMax) && parsedMax > 0 ? parsedMax : 10,
  };
}
