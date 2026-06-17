const { defineConfig, devices } = require("@playwright/test");

const useChromeChannel = process.env.PLAYWRIGHT_BUNDLED !== "1";

module.exports = defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  expect: {
    timeout: 8_000,
  },
  fullyParallel: false,
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:3000",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "off",
    ...(useChromeChannel ? { channel: process.env.PLAYWRIGHT_CHANNEL || "chrome" } : {}),
  },
  webServer: {
    command: "npm start",
    url: "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 120_000,
    env: {
      BROWSER: "none",
      PORT: "3000",
    },
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
