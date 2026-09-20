import { defineMain } from "@storybook/nextjs-vite/node";

export default defineMain({
  stories: ["../../../packages/ui/src/**/*.stories.@(ts|tsx)"],
  addons: ["@storybook/addon-docs", "@storybook/addon-a11y", "@storybook/addon-mcp"],
  framework: {
    name: "@storybook/nextjs-vite",
    options: {},
  },
  docs: {
    defaultName: "Documentation",
  },
});
