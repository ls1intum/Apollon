import { GenericContainer, type StartedTestContainer } from "testcontainers"

let container: StartedTestContainer | undefined

export async function setup() {
  // Escape hatch for running the suite against an already-running server, e.g.
  // a Valkey bundle container: `TEST_REDIS_URL=redis://127.0.0.1:6379 pnpm test`.
  // Every test ends with FLUSHDB, so only point this at a throwaway instance.
  if (process.env.TEST_REDIS_URL) {
    process.env.REDIS_URL = process.env.TEST_REDIS_URL
    process.env.OWNER_SECRET = "test-secret-test-secret-test-secret"
    return
  }

  // Pinned image — bump deliberately so a Redis Stack release can't silently
  // break CI. The image bundles RedisJSON ≥ 2.8 (verified at boot via
  // bootLoadFunction's MODULE LIST guard).
  container = await new GenericContainer("redis/redis-stack-server:7.4.0-v8")
    .withExposedPorts(6379)
    .withCommand([
      "redis-stack-server",
      "--appendonly",
      "yes",
      "--appendfsync",
      "everysec",
    ])
    .start()

  const port = container.getMappedPort(6379)
  const host = container.getHost()
  process.env.REDIS_URL = `redis://${host}:${port}`
  // Required by config.ts schema; deterministic for tests.
  process.env.OWNER_SECRET = "test-secret-test-secret-test-secret"
}

export async function teardown() {
  if (container) {
    await container.stop()
    container = undefined
  }
}
