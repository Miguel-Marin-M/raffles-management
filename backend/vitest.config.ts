import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.spec.ts'],
    exclude: ['**/node_modules/**', 'src/**/*.int.spec.ts'],
    coverage: {
      include: ['src/domain/**', 'src/application/**'],
    },
  },
});
