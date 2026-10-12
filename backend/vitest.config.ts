import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    setupFiles: ['./tests/setup.ts'],
    // Prayer text must never appear in logs, and the app must never be started by tests.
    reporters: ['default'],
  },
});
