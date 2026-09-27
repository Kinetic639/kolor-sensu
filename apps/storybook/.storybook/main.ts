import { defineMain } from "@storybook/nextjs-vite/node";

export default defineMain({
  stories: ["../../../packages/ui/src/**/*.stories.@(ts|tsx)"],
  addons: [
    "@storybook/addon-docs",
    "@storybook/addon-a11y",
    "@storybook/addon-mcp",
  ],
  // Public-site stories need the watercolor and brand assets served by
  // apps/web, the sample photos in ../public and the approved references
  // (for side-by-side comparison stories).
  staticDirs: [
    "../public",
    { from: "../../web/public/watercolor", to: "/watercolor" },
    { from: "../../web/public/brand", to: "/brand" },
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
