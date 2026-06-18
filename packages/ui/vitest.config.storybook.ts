import path from "node:path"
import { fileURLToPath } from "node:url"

import { storybookTest } from "@storybook/addon-vitest/vitest-plugin"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { playwright } from "@vitest/browser-playwright"
import { defineConfig } from "vitest/config"

const dirname =
  typeof __dirname !== "undefined"
    ? __dirname
    : path.dirname(fileURLToPath(import.meta.url))

// Storybook interaction/a11y tests in a real browser. SEPARATE from the jsdom
// vitest.config.ts (component unit tests) so the two never fight over env.
// Run with: pnpm --filter @tumaet/ui run test:storybook
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    storybookTest({
      configDir: path.join(dirname, ".storybook"),
      // --ci skips prompts and never opens a browser.
      storybookScript: "pnpm storybook --ci",
    }),
  ],
  test: {
    name: "storybook",
    browser: {
      enabled: true,
      headless: true,
      provider: playwright(),
      instances: [{ browser: "chromium" }],
    },
    setupFiles: [".storybook/vitest.setup.ts"],
  },
})
