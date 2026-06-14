import { defineConfig } from 'vitest/config';

/**
 * Vitest config for pure unit tests that have no database dependency.
 * Skips the globalSetup (which runs prisma migrate deploy) so these tests
 * can run without a running PostgreSQL instance.
 *
 * Usage:
 *   npx vitest run --config vitest.unit.config.ts <test-file>
 */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    setupFiles: ['./src/test/setup.ts'],
    pool: 'forks',
    poolOptions: {
      forks: { singleFork: true },
    },
  },
});
