import path from "node:path";
import { defineConfig } from "vitest/config";

// Tier-2 unit config (Cielo Testing Standard). Runs the pure-logic suites in
// tests/unit plus the vendored @workorder/kit tests that the root
// vitest.config.ts already covered, so `npm run test` exercises both.
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "../../src"),
    },
  },
  test: {
    root: path.resolve(__dirname, "../.."),
    include: [
      "tests/unit/**/*.test.ts",
      "src/vendor/workorder-kit/**/*.test.ts",
    ],
  },
});
