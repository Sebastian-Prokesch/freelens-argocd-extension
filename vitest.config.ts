import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";
import { standardDecorators } from "./build/vite-plugin-standard-decorators.mjs";

export default defineConfig({
  plugins: [standardDecorators(), react()],
  css: {
    modules: {
      localsConvention: "camelCaseOnly",
    },
  },
  resolve: {
    alias: {
      // The real package reads a host-provided global and throws outside the
      // host, so unit tests use a hand-written stub.
      "@freelensapp/extensions": new URL("./src/test/freelens-extensions.tsx", import.meta.url).pathname,
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    clearMocks: true,
    setupFiles: ["./src/test/vitest.setup.ts"],
    include: ["src/**/__tests__/**/*.test.{ts,tsx}"],
    exclude: ["integration/**", "node_modules/**", "dist/**"],
    css: { modules: { classNameStrategy: "non-scoped" } },
  },
});
