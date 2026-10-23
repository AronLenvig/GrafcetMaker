import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: 'http://localhost:4391',
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    // The live collaboration relay (server/relay.ts), reached through the preview server's proxy.
    {
      command: 'node server/relay.ts',
      url: 'http://localhost:4392/api/room',
      env: { PORT: '4392' },
      reuseExistingServer: !process.env.CI,
      timeout: 30_000,
    },
    {
      command: 'npx vite preview --port 4391 --strictPort',
      url: 'http://localhost:4391',
      env: { GM_RELAY_URL: 'http://localhost:4392' },
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
    },
  ],
});
