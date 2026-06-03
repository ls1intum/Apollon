import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    globals: false,
    environment: "node",
    include: ["src/**/*.test.ts", "src/__tests__/**/*.test.ts"],
    exclude: ["node_modules", "dist"],
    // Testcontainers crashes with worker reuse, and we provision exactly one
    // Redis container per run (via globalSetup) — every test file shares it.
    // Vitest 4 removed `poolOptions.forks.singleFork` and replaced it with
    // `maxWorkers: 1` + `isolate: false`. Without this, vitest 4 spawns N
    // forks in parallel and each test's `flushDb` racing against another
    // fork's queued commands produces nondeterministic 404s on a diagram
    // the test just created.
    pool: "forks",
    maxWorkers: 1,
    isolate: false,
    globalSetup: ["./src/__tests__/globalSetup.ts"],
    setupFiles: ["./src/__tests__/setup.ts"],
    testTimeout: 30_000,
    hookTimeout: 60_000,
  },
})
