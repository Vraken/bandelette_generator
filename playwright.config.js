import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30000,
  fullyParallel: true,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:8903',
    viewport: { width: 1400, height: 1000 },
  },
  webServer: {
    command: 'python3 -m http.server 8903',
    url: 'http://localhost:8903/index.html',
    reuseExistingServer: true,
  },
});
