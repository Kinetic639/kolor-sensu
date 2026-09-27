// Project annotations for the stories run as Vitest tests (addon-vitest):
// the same preview (styles, decorators, viewports, parameters) and the
// accessibility checks (a11y.test: "error" in preview.tsx fails a story on
// a violation). Storybook's beforeAll hook is loaded by the addon itself.
import * as a11yAddonAnnotations from "@storybook/addon-a11y/preview";
import { setProjectAnnotations } from "@storybook/nextjs-vite";
import * as projectAnnotations from "./preview";

setProjectAnnotations([a11yAddonAnnotations, projectAnnotations]);
