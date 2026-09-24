import { defineConfig, devices } from '@playwright/test';

// Runs against the production build: `npm run build` first.
// Set CHROMIUM_PATH to use a preinstalled Chromium instead of Playwright's download.
export default defineConfig({
  testDir: 'e2e',
  timeout: 60_000,
  use: {
    baseURL: 'http://localhost:8788',
    ...devices['iPhone 13'],
    browserName: 'chromium',
    launchOptions: process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {},
    geolocation: { latitude: 12.978, longitude: 77.641 },
    permissions: ['geolocation'],
  },
  webServer: {
    command: 'mkdir -p test-results && rm -f data/e2e.db* && NODE_ENV=production PORT=8788 APP_ORIGIN=http://localhost:8788 DATABASE_PATH=data/e2e.db node --import tsx server/index.ts > test-results/server.log 2>&1',
    url: 'http://localhost:8788/api/health',
    reuseExistingServer: false,
  },
});
