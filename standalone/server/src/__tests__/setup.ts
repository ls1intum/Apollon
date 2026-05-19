// Per-worker setup. Shared Redis client + lifecycle hooks.
import { afterAll, afterEach, beforeAll } from "vitest"
import { bootLoadFunction, createRedisClient, type Redis } from "../redis.js"

let _redis: Redis | undefined

export async function getRedis(): Promise<Redis> {
  if (!_redis) {
    _redis = createRedisClient(process.env.REDIS_URL!)
    await _redis.connect()
    await bootLoadFunction(_redis)
  }
  return _redis
}

beforeAll(async () => {
  await getRedis()
})

afterEach(async () => {
  // Clean state between tests; preserves the loaded Lua function.
  const r = await getRedis()
  await r.flushDb()
})

afterAll(async () => {
  if (_redis) {
    try {
      await _redis.quit()
    } catch {
      // ignore
    }
    _redis = undefined
  }
})
