import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    // One jsdom per worker instead of one per file (files stay isolated):
    // the suite runs in about a quarter of the time.
    pool: "vmThreads",
    setupFiles: ["./src/test/setup.ts"],
  },
});
