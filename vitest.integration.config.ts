import { defineConfig } from "vitest/config";

// Drives a real Freelens 2 binary with Playwright. Needs FREELENS_EXECUTABLE_PATH
// (or FREELENS_PATH / FREELENS_BINARY) and EXTENSION_PATH; skips silently without them.
export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    include: ["integration/**/__tests__/**/*.test.ts"],
    testTimeout: 5 * 60 * 1000,
    hookTimeout: 5 * 60 * 1000,
    passWithNoTests: true,
  },
});
