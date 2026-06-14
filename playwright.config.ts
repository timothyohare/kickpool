import { defineConfig, devices } from '@playwright/test';

// Self-contained E2E (Plan 05). Playwright boots its own production server with
// the golden-fixture toggles so the suite is deterministic and offline:
//   USE_FIXTURES=1 → ESPN from fixtures/espn/*.json
//   MOCK_LLM=1     → predictions from the deterministic generator (no Anthropic)
//   ANTHROPIC_API_KEY → set to a dummy so /api/predict's guard passes (the call
//                       is still mocked by MOCK_LLM, so no spend / network)
//   FIXTURE_SCENARIO → passed through; `npm run test:e2e:live` sets it to "live"
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    // Production fidelity per the Next guide; swap to `npm run dev` for faster local iteration.
    command: 'npm run build && npm run start',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    env: {
      USE_FIXTURES: '1',
      MOCK_LLM: '1',
      ANTHROPIC_API_KEY: 'e2e-mock-key',
      // Force the in-memory prediction store (no DynamoDB needed for E2E).
      DYNAMODB_ENDPOINT: '',
      FIXTURE_SCENARIO: process.env.FIXTURE_SCENARIO ?? '',
    },
  },
});
