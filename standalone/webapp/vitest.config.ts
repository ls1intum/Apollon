import { defineConfig } from "vitest/config"
import react from "@vitejs/plugin-react"
import { resolve } from "path"

/**
 * Vitest config for webapp unit tests. Mirrors the `vite.config.ts` aliases
 * so Modal/Page imports that use the `assets/...` path (HowToUseModal etc.)
 * resolve correctly when components are mounted in jsdom.
 */
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
      assets: resolve(__dirname, "assets"),
    },
  },
  // Image / non-JS asset imports need a stub when the test doesn't render
  // them; Vitest treats them as URL strings via this asset stub.
  assetsInclude: ["**/*.png", "**/*.svg"],
  test: {
    globals: true,
    environment: "jsdom",
    include: ["src/**/*.test.{ts,tsx}", "tests/unit/**/*.test.{ts,tsx}"],
    setupFiles: ["./tests/setup.ts"],
    server: {
      deps: {
        // The workspace library is injected as a built ESM package that imports
        // MUI subpaths (e.g. `@mui/material/Tooltip`). Inline it so Vite resolves
        // those imports the same way the app bundle does, instead of failing
        // under Node's externalized ESM directory-import resolution.
        inline: [/@tumaet\/apollon/],
      },
    },
  },
})
