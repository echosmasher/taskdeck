import { defineConfig, devices } from "@playwright/test";

/**
 * A small set of E2E smoke tests (spec §2), not exhaustive coverage —
 * task 24. Runs against `pnpm dev` + the local Supabase stack (same
 * precondition as `pnpm seed`); globalSetup seeds known demo data
 * before anything runs. Single worker: specs act through the shared
 * demo dataset (the same "Explore as Admin/Member" accounts, the same
 * reassignment-request lifecycle), so they aren't safe to parallelize
 * against each other.
 */
export default defineConfig({
  testDir: "./tests/e2e",
  globalSetup: "./tests/e2e/global-setup.ts",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: "list",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "pnpm dev",
    url: "http://localhost:3000/login",
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
