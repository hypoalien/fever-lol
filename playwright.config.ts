import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end tests.
 *
 * These drive a real browser against a real Next server and a real Postgres,
 * against its own database so a run cannot disturb development data. The
 * global setup migrates and seeds it.
 */

const PORT = Number(process.env.E2E_PORT ?? 3100);
const BASE_URL = `http://127.0.0.1:${PORT}`;

export const E2E_DATABASE_URL =
  process.env.E2E_DATABASE_URL ??
  "postgres://fever:fever@localhost:5433/fever_lol_e2e";

export default defineConfig({
  testDir: "./tests/e2e",
  // Each spec seeds and asserts against shared rows, so they run in sequence.
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : [["list"]],
  timeout: 30_000,
  expect: { timeout: 10_000 },

  globalSetup: "./tests/e2e/global-setup.ts",

  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },

  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],

  webServer: {
    // Built rather than dev: closer to production, and no HMR flakiness.
    command: "bun run build && bun run start",
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    env: {
      PORT: String(PORT),
      DATABASE_URL: E2E_DATABASE_URL,
      BETTER_AUTH_URL: BASE_URL,
      BETTER_AUTH_SECRET:
        process.env.BETTER_AUTH_SECRET ?? "e2e-secret-not-used-in-production",
      // Keeps magic links on the console instead of hitting Resend.
      NODE_ENV: "production",
      E2E: "1",
    },
  },
});
