import { defineConfig, devices } from "@playwright/test"

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [["github"], ["html"]] : "html",
  timeout: 30000,

  use: {
    baseURL: "http://localhost:5173",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },

  // Remove {platform} from snapshot paths so a single set of baselines works
  // across macOS and Linux.  SVG export tests use a bundled font (Liberation
  // Sans) for deterministic resvg rendering.  Canvas screenshot baselines are
  // generated inside the Playwright Docker container to guarantee consistency;
  // see the "visual-regression-tests" CI job and the docker command in
  // pr-health-checks.yaml.
  snapshotPathTemplate:
    "{testDir}/{testFileDir}/{testFileName}-snapshots/{arg}{ext}",

  expect: {
    toHaveScreenshot: {
      maxDiffPixelRatio: 0.01,
      threshold: 0.2,
      animations: "disabled",
    },
  },

  projects: [
    {
      name: "chromium",
      // The perf suite has its own serial, retry-free project below; keep it
      // out of the parallel functional run.
      testIgnore: "**/perf/**",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1280, height: 720 },
      },
    },
    // Firefox is where the Apollon-in-Artemis exam freeze was observed, so the
    // functional suite should run there too. It's opt-in (PLAYWRIGHT_FIREFOX=1
    // via `pnpm test:e2e:firefox`) so the default run — and CI that only
    // installs chromium — doesn't fail launching an uninstalled browser. Enable
    // it in a CI job that runs `playwright install firefox` first.
    ...(process.env.PLAYWRIGHT_FIREFOX === "1"
      ? [
          {
            name: "firefox",
            testIgnore: "**/perf/**",
            use: {
              ...devices["Desktop Firefox"],
              viewport: { width: 1280, height: 720 },
            },
          },
        ]
      : []),
    {
      // Document-growth / broadcast budgets. Measurements must be stable:
      // run serially (one page contending for CPU at a time) and never retry,
      // so a flaky pass can't mask a real regression.
      name: "perf",
      testDir: "./tests/perf",
      fullyParallel: false,
      retries: 0,
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1280, height: 720 },
      },
    },
  ],

  webServer: {
    command: "pnpm run start",
    url: "http://localhost:5173",
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
})
