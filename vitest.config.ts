import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      // The Workers runtime module, for the worker's code (worker/collab.ts).
      'cloudflare:workers': fileURLToPath(
        new URL('./tests/fixtures/cloudflare-workers.ts', import.meta.url),
      ),
    },
  },
  test: {
    include: ['tests/unit/**/*.test.ts'],
    environment: 'node',
  },
});
