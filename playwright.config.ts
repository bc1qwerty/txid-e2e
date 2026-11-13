import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 60000,
  retries: 1,
  forbidOnly: !!process.env.CI,
  reporter: process.env.CI
    ? [['list'], ['html', { open: 'never' }], ['./flaky-reporter.ts']]
    : [['list'], ['./flaky-reporter.ts']],
  use: {
    headless: true,
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
  ],
});
