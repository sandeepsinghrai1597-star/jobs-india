import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  workers: 1,
  timeout: 90_000,
  expect: {
    timeout: 10_000,
  },
  reporter: [
    ["list"],
    ["json", { outputFile: "test-results/playwright-report.json" }],
    ["html", { outputFolder: "playwright-report", open: "never" }],
  ],
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    // The suite drives ~20 sign-ins from one IP; the 10/min auth limiter would
    // otherwise 429 whichever spec runs late. Only takes effect when Playwright
    // starts the server itself — see login() in e2e/utils.ts for the fallback
    // that covers `reuseExistingServer` hitting an already-running dev server.
    env: { AUTH_RATE_LIMIT_DISABLED: "true" },
    reuseExistingServer: true,
    timeout: 180_000,
  },
  globalSetup: "./e2e/global.setup.ts",
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
