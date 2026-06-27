import path from "node:path"
import { fileURLToPath } from "node:url"

import { storybookTest } from "@storybook/addon-vitest/vitest-plugin"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { playwright } from "@vitest/browser-playwright"
import { defineConfig } from "vitest/config"

import { apollonAliasResolver, apollonAliases } from "./build/viteResolve"

const dirname =
  typeof __dirname !== "undefined"
    ? __dirname
    : path.dirname(fileURLToPath(import.meta.url))

// Storybook interaction/a11y tests in a real browser, SEPARATE from the jsdom
// vitest.config.ts (component unit tests) so the two never fight over env.
// `--config` means vite.config.ts is NOT auto-merged, so the cross-package
// source resolution (aliases + the library @/ resolver) is wired in here too.
// Run with: pnpm --filter @tumaet/webapp run test:storybook
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    apollonAliasResolver,
    storybookTest({ configDir: path.join(dirname, ".storybook") }),
  ],
  resolve: {
    alias: apollonAliases,
    dedupe: ["react", "react-dom"],
  },
  // The editor library uses `@/` imports rewritten at load time by
  // apollonAliasResolver; esbuild's optimizeDeps pre-bundle scan runs before
  // that hook and can't resolve them, so exclude the editor from pre-bundling
  // (it's loaded on demand at runtime) — mirrors the webapp's vite.config.ts.
  optimizeDeps: {
    exclude: ["@tumaet/apollon"],
  },
  // Browser mode serves files via Vite; the editor source lives outside the
  // webapp root, so allow the monorepo root.
  server: {
    fs: { allow: [path.resolve(dirname, "..", "..")] },
  },
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
