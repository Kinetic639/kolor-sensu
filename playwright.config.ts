import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: "list",
  use: {
    trace: "retain-on-failure",
  },
  webServer: [
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
