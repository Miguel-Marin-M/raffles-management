import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { config } from 'dotenv';

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/**
 * Loads the API environment from backend/.env, with .env.local taking
 * precedence for machine-specific overrides that stay out of version control.
 *
 * Imported for its side effect by entry points and tooling (drizzle-kit,
 * migration script) before any configuration is read.
 */
export function loadEnv(): void {
  for (const file of ['.env', '.env.local']) {
    const path = resolve(packageRoot, file);
    if (existsSync(path)) config({ path, override: true, quiet: true });
  }
}

loadEnv();
