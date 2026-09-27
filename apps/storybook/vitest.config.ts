// Storybook component tests (addon-vitest): every story of the stories
// Storybook loads (.storybook/main.ts) becomes a test that renders it in a
// real browser (Chromium through Playwright), runs its play function
// (interactions) and its accessibility checks.
//
//   pnpm --filter @kolor-sensu/storybook test-storybook        (once)
//   pnpm --filter @kolor-sensu/storybook test-storybook:watch  (watch)
//
// or the testing widget in the Storybook sidebar. The Storybook app uses
// Vitest 4, the version addon-vitest 10 supports; the packages' own unit
// tests (packages/*/vitest.config) stay on their Vitest.
import path from "node:path";
import { fileURLToPath } from "node:url";
import { storybookTest } from "@storybook/addon-vitest/vitest-plugin";
import { playwright } from "@vitest/browser-playwright";
import { defineConfig } from "vitest/config";

const dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    projects: [
      {
        extends: true,
        plugins: [
          storybookTest({
            // Where main.ts is.
            configDir: path.join(dirname, ".storybook"),
            // How the Storybook UI is started (package.json), so the tests
            // can link failures to their stories.
            storybookScript: "pnpm storybook --no-open",
          }),
        ],
        test: {
          name: "storybook",
          browser: {
            enabled: true,
            provider: playwright(),
            headless: true,
            instances: [{ browser: "chromium" }],
          },
          setupFiles: ["./.storybook/vitest.setup.ts"],
        },
      },
    ],
  },
});
