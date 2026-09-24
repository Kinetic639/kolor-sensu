import { defineMain } from "@storybook/nextjs-vite/node";

export default defineMain({
  stories: ["../../../packages/ui/src/**/*.stories.@(ts|tsx)"],
  addons: [
    "@storybook/addon-docs",
    "@storybook/addon-a11y",
    "@storybook/addon-mcp",
  ],
  // Public-site stories need the painted masks served by apps/web and a few
  // deterministic placeholder photos (crops of the approved references).
  staticDirs: [
    "../public",
    { from: "../../web/public/watercolor", to: "/watercolor" },
  ],
  framework: {
    name: "@storybook/nextjs-vite",
    options: {},
  },
  docs: {
    defaultName: "Documentation",
  },
});
