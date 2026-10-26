import { nextJsConfig } from "@repo/config/eslint/next-js";

/** @type {import("eslint").Linter.Config[]} */
export default [
  ...nextJsConfig,
  // Unmodified upstream runtime used only by the saved standalone mockup.
  { ignores: ["public/crisis/vendor/**"] },
];
