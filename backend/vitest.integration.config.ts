import { defineConfig } from 'vitest/config';

/**
 * Integration suite. Requires the PostgreSQL container to be running and the
 * migrations applied, so it is kept out of the default `test` run.
 */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.int.spec.ts'],
    // Transactions racing for the same row must run in one process.
    fileParallelism: false,
    testTimeout: 20_000,
  },
});
