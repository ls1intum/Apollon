import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    globals: false,
    environment: "node",
    include: ["src/**/*.test.ts", "src/__tests__/**/*.test.ts"],
    exclude: ["node_modules", "dist"],
    pool: "forks", // Testcontainers crashes with worker reuse.
    poolOptions: {
      forks: {
        singleFork: true, // One Redis container per run, all tests share.
      },
    },
    globalSetup: ["./src/__tests__/globalSetup.ts"],
    setupFiles: ["./src/__tests__/setup.ts"],
    testTimeout: 30_000,
    hookTimeout: 60_000,
  },
})
