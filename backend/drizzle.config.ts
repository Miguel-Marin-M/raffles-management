import { defineConfig } from 'drizzle-kit';

import './src/load-env.js';

const url = process.env['DATABASE_URL'];
if (url === undefined || url === '') {
  throw new Error('DATABASE_URL is not set');
}

export default defineConfig({
  schema: './src/infrastructure/database/schema/index.ts',
  out: './drizzle',
  dialect: 'postgresql',
  casing: 'snake_case',
  strict: true,
  verbose: true,
  dbCredentials: { url },
});
