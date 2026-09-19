import type { Preview } from "@storybook/nextjs-vite";
import "../src/styles.css";

const viewportOptions = {
  mobileSmall: {
    name: "Mobile small (375)",
    styles: { width: "375px", height: "812px" },
    type: "mobile",
  },
  mobile: {
    name: "Mobile (390)",
    styles: { width: "390px", height: "844px" },
    type: "mobile",
  },
  mobileLarge: {
    name: "Mobile large (430)",
    styles: { width: "430px", height: "932px" },
    type: "mobile",
  },
  tablet: {
    name: "Tablet (768)",
    styles: { width: "768px", height: "1024px" },
    type: "tablet",
  },
  tabletLarge: {
    name: "Tablet large (1024)",
    styles: { width: "1024px", height: "1366px" },
    type: "tablet",
  },
  laptop: {
    name: "Laptop (1280)",
    styles: { width: "1280px", height: "800px" },
    type: "desktop",
  },
  desktop: {
    name: "Desktop (1440)",
    styles: { width: "1440px", height: "1000px" },
    type: "desktop",
  },
} as const;

const preview: Preview = {
  decorators: [
    (Story, context) => (
      <div
        className={
          context.parameters.canvasPadding === false
            ? "min-h-screen bg-[var(--background)] text-[var(--text)]"
            : "min-h-screen bg-[var(--background)] p-6 text-[var(--text)]"
        }
      >
        <Story />
      </div>
    ),
  ],
  parameters: {
    actions: { argTypesRegex: "^on[A-Z].*" },
    a11y: {
      test: "error",
    },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    layout: "fullscreen",
    viewport: {
      options: viewportOptions,
    },
  },
};

export default preview;
