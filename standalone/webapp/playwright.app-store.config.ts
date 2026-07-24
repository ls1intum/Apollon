import { defineConfig } from "@playwright/test"

export default defineConfig({
  testDir: "./app-store-screenshots",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: "list",
  timeout: 60_000,
  globalSetup: "./app-store-screenshots/global-setup.ts",

  use: {
    baseURL: "http://127.0.0.1:4173",
    browserName: "chromium",
    colorScheme: "light",
    hasTouch: true,
    isMobile: true,
    locale: "en-US",
    reducedMotion: "reduce",
    screenshot: "off",
    trace: "retain-on-failure",
  },

  projects: [
    {
      // 6.9-inch App Store slot: 430 × 932 points at 3× = 1290 × 2796 px.
      // The filename is also a device identifier Fastlane can route.
      name: "iPhone 16 Pro Max",
      use: {
        viewport: { width: 430, height: 932 },
        deviceScaleFactor: 3,
        userAgent:
          "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148",
      },
    },
    {
      // Highest required iPad slot: 1366 × 1024 points at 2× =
      // 2732 × 2048 px. Fastlane recognizes this established device label.
      name: "iPad Pro (12.9-inch) (3rd generation)",
      use: {
        viewport: { width: 1366, height: 1024 },
        deviceScaleFactor: 2,
        userAgent:
          "Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148",
      },
    },
  ],

  webServer: {
    command:
      "VITE_E2E=true pnpm run build && pnpm exec vite preview --host 127.0.0.1 --port 4173 --strictPort",
    url: "http://127.0.0.1:4173",
    reuseExistingServer: false,
    timeout: 240_000,
  },
})
