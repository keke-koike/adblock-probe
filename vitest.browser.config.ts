import { playwright } from "@vitest/browser-playwright";
import { defineConfig } from "vitest/config";

export default defineConfig({
  // Exposes browser-test-only probe fixtures as root-relative URLs through Vite.
  publicDir: "test/browser/fixtures/public",
  test: {
    include: ["test/browser/**/*.test.{ts,tsx}"],
    browser: {
      enabled: true,
      headless: true,
      provider: playwright(),
      instances: [{ browser: "chromium" }, { browser: "firefox" }, { browser: "webkit" }],
    },
  },
});
