import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Exclude Playwright tests (they use @playwright/test, not vitest)
    exclude: [
      "**/node_modules/**",
      "**/dist/**",
      "**/admin/tests/**",  // Playwright tests
      "**/*.spec.ts",       // Playwright convention
    ],
  },
});
