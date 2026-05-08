import { defineConfig } from "vitest/config"
import react from "@vitejs/plugin-react"
import { resolve } from "path"

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
    include: ["tests/unit/**/*.test.{ts,tsx}"],
  },
})
