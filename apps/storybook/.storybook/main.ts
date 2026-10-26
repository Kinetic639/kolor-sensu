import { defineMain } from "@storybook/nextjs-vite/node";

export default defineMain({
  stories: ["../../../packages/ui/src/**/*.stories.@(ts|tsx)"],
  addons: [
    "@storybook/addon-docs",
    "@storybook/addon-a11y",
    "@storybook/addon-mcp",
    // Component tests: every story is a test (render, play function,
    // accessibility), run by Vitest in a real browser, from the Storybook UI
    // or with `pnpm test-storybook` (vitest.config.ts).
    "@storybook/addon-vitest",
    // Visual tests: snapshots of every story compared in Chromatic, from the
    // Visual Tests panel (sign in to Chromatic the first time).
    "@chromatic-com/storybook",
  ],
  // Public-site stories need the watercolor and brand assets served by
  // apps/web, the sample photos in ../public and the approved references
  // (for side-by-side comparison stories).
  staticDirs: [
    "../public",
    { from: "../../web/public/watercolor", to: "/watercolor" },
    { from: "../../web/public/brand", to: "/brand" },
    { from: "../../web/public/crisis", to: "/crisis" },
    { from: "../../../docs/design/references/public", to: "/references" },
  ],
  framework: {
    name: "@storybook/nextjs-vite",
    options: {},
  },
  docs: {
    defaultName: "Documentation",
  },
});
