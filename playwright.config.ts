import { defineConfig, devices } from '@playwright/test';
import { ENV } from './config/env';

export default defineConfig({
  testDir: './tests',

  // AI responses can take up to 30s – global timeout covers that
  timeout: 60 * 1000,
  expect: { timeout: 15000 },

  // Sequential execution – prevents rate-limiting the chatbot API
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  workers: 1,

  reporter: [
    ['html', { outputFolder: 'reports/html-report', open: 'never' }],
    ['list'],
    ['json', { outputFile: 'reports/test-results.json' }],
    ['allure-playwright', { outputFolder: 'allure-results', suiteTitle: true }],
  ],

  use: {
    baseURL: ENV.BASE_URL,
    headless: true,
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'on-first-retry',
    actionTimeout: 15000,
    navigationTimeout: 30000,
    locale: 'en-US',
  },

  projects: [
    // Browser project – runs all UI-based tests (positive, negative, edge, security, quality, e2e)
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      testIgnore: ['**/api/**'],
    },

    // API project – no browser, uses Playwright's request fixture only
    {
      name: 'api',
      testMatch: ['**/api/**'],
    },
  ],

  outputDir: 'test-results/',
});

