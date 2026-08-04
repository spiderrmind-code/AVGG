import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: false,
  workers: 1,
  reporter: "list",
  use: { baseURL: "http://127.0.0.1:3100", screenshot: "only-on-failure", trace: "on-first-retry", video: "off" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: { command: "npm run build && npm run start -- --port 3100", url: "http://127.0.0.1:3100", reuseExistingServer: true, timeout: 120_000 },
});
