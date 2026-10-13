import { existsSync } from "node:fs";
import { defineConfig } from "@playwright/test";

// The test accounts live in the root .env.local (gitignored); in CI they
// come from secrets, which this never overrides.
if (existsSync(".env.local")) process.loadEnvFile(".env.local");

// E2E_TARGET=dev|staging runs the same tests against the deployed sites
// (see tests/e2e/support/target.ts); locally Playwright starts the apps.
const remote = (process.env.E2E_TARGET ?? "local") !== "local";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  // Tests that leave lasting changes (catalogue, CMS drafts) run only locally.
  grepInvert: remote ? /@writes-data/ : undefined,
  use: {
    trace: "retain-on-failure",
    locale: "pl-PL",
    timezoneId: "Europe/Warsaw",
  },
  webServer: remote
    ? undefined
    : [
        {
          command: "pnpm --filter @kolor-sensu/web dev",
          url: "http://localhost:3000/icon.svg",
          reuseExistingServer: !process.env.CI,
          timeout: 120_000,
        },
        {
          command: "pnpm --filter @kolor-sensu/admin dev",
          url: "http://localhost:3001/login",
          reuseExistingServer: !process.env.CI,
          timeout: 120_000,
        },
        {
          command: "pnpm --filter @kolor-sensu/specialist dev",
          url: "http://localhost:3002/login",
          reuseExistingServer: !process.env.CI,
          timeout: 120_000,
        },
      ],
});
