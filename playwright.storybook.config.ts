import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/visual",
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: "list",
  outputDir: "artifacts/playwright-portal",
  use: {
    baseURL: "http://127.0.0.1:6006",
    trace: "off",
  },
  webServer: {
    command: "pnpm storybook",
    url: "http://127.0.0.1:6006",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
