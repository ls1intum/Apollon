import { defineConfig, devices } from "@playwright/test"

// `PLAYWRIGHT_BUILT=1` reproduces CI's bundled-preview server locally without
// also enabling CI reporters/retries. This avoids reusing an unrelated dev
// server and is the reliable release-validation mode for the complete suite.
const BUILT_PREVIEW = Boolean(process.env.CI || process.env.PLAYWRIGHT_BUILT)

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  // 1 retry absorbs a one-off hiccup without masking persistent flake. Perf
  // projects pin retries:0 so a retried pass can't hide a doc-growth regression.
  retries: process.env.CI ? 1 : 0,
  // Functional specs are independent, so parallelise (a global workers:1 was the
  // e2e bottleneck). 50% mirrors Playwright's CI-safe default — on a 4-vCPU
  // runner that's 2 real-browser workers; the perf projects pin workers:1.
  workers: process.env.CI ? "50%" : undefined,
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
  // see the "visual-regression-tests" job in pr-health-checks.yml and the docker
  // command in docs/contributor/development/visual-tests.md.
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
      // out of the parallel functional run. The how-to-use and readme-assets
      // specs are owned by their dedicated projects (different
      // snapshotPathTemplates), so exclude them here too.
      testIgnore: [
        "**/perf/**",
        "**/how-to-use.visual.spec.ts",
        "**/readme-assets.visual.spec.ts",
      ],
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1280, height: 720 },
      },
    },
    {
      // Generates the four "How this editor works" modal images straight from
      // the live editor — ONE source of truth. Its snapshotPathTemplate writes
      // (and reads, for the regression diff) the exact PNGs HowToUseModal.tsx
      // imports under assets/images/, NOT the *-snapshots dirs the other
      // projects use. Regenerate with:
      //   pnpm exec playwright test --project howto-assets --update-snapshots
      name: "howto-assets",
      testMatch: "**/how-to-use.visual.spec.ts",
      snapshotPathTemplate: "{testDir}/../assets/images/how-to-use-{arg}{ext}",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1280, height: 720 },
      },
    },
    {
      // Generates the public-facing marketing assets — the README hero
      // screenshots (light + dark) and the 1280×640 GitHub social preview
      // card — straight from the live editor, same one-source-of-truth
      // pattern as howto-assets. Its snapshotPathTemplate writes (and reads,
      // for the regression diff) the exact PNGs README.md, library/README.md,
      // and docs/docusaurus.config.ts reference under docs/static/img/.
      // Regenerate with:
      //   pnpm exec playwright test --project readme-assets --update-snapshots
      name: "readme-assets",
      testMatch: "**/readme-assets.visual.spec.ts",
      snapshotPathTemplate: "{testDir}/../../../docs/static/img/{arg}{ext}",
      use: {
        ...devices["Desktop Chrome"],
        // Larger viewport + 2× scale so the hero holds up at README width on
        // high-DPI displays. The social-card test overrides both to hit
        // GitHub's exact 1280×640 spec.
        viewport: { width: 1440, height: 810 },
        deviceScaleFactor: 2,
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
            // The how-to-use and readme assets are baselined once, in their
            // pinned chromium projects; don't regenerate/diff them on firefox.
            testIgnore: [
              "**/perf/**",
              "**/how-to-use.visual.spec.ts",
              "**/readme-assets.visual.spec.ts",
            ],
            use: {
              ...devices["Desktop Firefox"],
              viewport: { width: 1280, height: 720 },
            },
          },
          {
            // The freeze regression guard, run on the browser the freeze was
            // actually reported in. Same serial, retry-free, long-timeout
            // setup as the chromium `perf` project.
            name: "perf-firefox",
            testDir: "./tests/perf",
            fullyParallel: false,
            // Serial measurement (CPU isolation): pin workers:1 so the budget
            // never runs parallel under the global workers setting.
            workers: 1,
            retries: 0,
            timeout: 120_000,
            use: {
              ...devices["Desktop Firefox"],
              viewport: { width: 1280, height: 720 },
            },
          },
        ]
      : []),
    {
      // Document-growth budget. Measurements must be stable:
      // run serially (one page contending for CPU at a time) and never retry,
      // so a flaky pass can't mask a real regression.
      name: "perf",
      testDir: "./tests/perf",
      fullyParallel: false,
      // Serial measurement (CPU isolation): pin workers:1 so the budget never
      // runs parallel under the global workers setting.
      workers: 1,
      retries: 0,
      // The drag-stress workload (tens of gestures, each with a settle wait)
      // runs well past the default 30s on a slower CI runner.
      timeout: 120_000,
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1280, height: 720 },
      },
    },
  ],

  webServer: {
    // CI serves a bundled build via `vite preview`; local runs use the dev
    // server. Bundling matters for e2e: the dev server transforms the heavy
    // editor route on demand, so a fresh browser context per test refetches
    // hundreds of ESM modules — slow and nondeterministic under parallel workers,
    // where a bundled build is a handful of static files. `VITE_E2E=true` keeps
    // the test seams (src/pages/ApollonLocal.tsx, src/index.tsx,
    // src/utils/perfHooks) a plain prod build strips; `build:lib` runs earlier in
    // the e2e job so the webapp build resolves `@tumaet/apollon`.
    command: BUILT_PREVIEW
      ? "VITE_E2E=true pnpm run build && pnpm exec vite preview --port 5173 --strictPort"
      : "pnpm run start",
    url: "http://localhost:5173",
    reuseExistingServer: !BUILT_PREVIEW,
    // CI rebuilds before serving, so allow more startup time.
    timeout: BUILT_PREVIEW ? 240_000 : 120_000,
  },
})
