import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";
const isCI = Boolean(process.env.CI);
const enableCrossBrowser = process.env.PLAYWRIGHT_ENABLE_CROSS_BROWSER === "1";
const configuredWorkers = Number(process.env.PLAYWRIGHT_WORKERS ?? "1");
const workers =
  Number.isFinite(configuredWorkers) && configuredWorkers > 0 ? configuredWorkers : 1;

const projects = [
  {
    name: "chromium",
    use: {
      ...devices["Desktop Chrome"],
    },
  },
];

if (enableCrossBrowser) {
  projects.push(
    {
      name: "firefox",
      use: {
        ...devices["Desktop Firefox"],
      },
    },
    {
      name: "webkit",
      use: {
        ...devices["Desktop Safari"],
      },
    },
  );
}

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  reporter: [["list"], ["html", { open: "never" }]],
  timeout: 60_000,
  expect: {
    timeout: 10_000,
  },
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "off",
    viewport: { width: 1440, height: 960 },
  },
  projects,
});
