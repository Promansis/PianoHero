import { defineConfig } from 'vitest/config';

export default defineConfig({
  define: {
    IS_WEB: 'false',
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
  },
});
