import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['./testing/vitestSetup.ts'],
    include: ['packages/*/src/**/*.test.ts'],
  },
});
