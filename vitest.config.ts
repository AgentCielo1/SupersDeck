import { defineConfig } from "vitest/config";

// Scoped to the vendored @workorder/kit — pure TypeScript, no DOM/Next needed.
export default defineConfig({
  test: {
    include: ["src/vendor/workorder-kit/**/*.test.ts"],
  },
});
