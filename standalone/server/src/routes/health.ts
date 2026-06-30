import { Hono } from "hono"
import type { AppEnv } from "../http/env.js"
import type { Redis } from "../redis.js"

interface Deps {
  redis: Redis
}

const APOLLON_LIBRARY_NAME = "apollon"

/**
 * Cached deep-check result; refreshed at most every 30 s. Without the cache,
 * every load-balancer health probe round-trips two Redis commands, and
 * `FUNCTION LIST` is not free.
 */
let lastDeepCheck: { ok: boolean; at: number } = { ok: false, at: 0 }
const DEEP_CHECK_TTL_MS = 30_000

async function deepCheck(redis: Redis): Promise<boolean> {
  const now = Date.now()
  if (now - lastDeepCheck.at < DEEP_CHECK_TTL_MS) return lastDeepCheck.ok
  try {
    await redis.ping()
    // FUNCTION LIST returns an array of library descriptors. We only need to
    // confirm `apollon` exists; the function names are checked transitively
    // by the integration test suite.
    const libs = (await redis.sendCommand([
      "FUNCTION",
      "LIST",
      "LIBRARYNAME",
      APOLLON_LIBRARY_NAME,
    ])) as unknown[]
    const ok = Array.isArray(libs) && libs.length > 0
    lastDeepCheck = { ok, at: now }
    return ok
  } catch {
    lastDeepCheck = { ok: false, at: now }
    return false
  }
}

export function mountHealthRoutes({ redis }: Deps): Hono<AppEnv> {
  const router = new Hono<AppEnv>()

  // Liveness — instant. Connectivity only.
  router.get("/", async (c) => {
    try {
      await redis.ping()
      return c.json({ status: "ok" }, 200)
    } catch {
      return c.json({ status: "error", message: "redis unavailable" }, 503)
    }
  })

  // Readiness — deeper. Confirms Lua functions are loaded, so a half-booted
  // server (Redis up but `bootLoadFunction` failed) doesn't get marked
  // ready. Cached 30 s to keep the load-balancer probe cheap.
  router.get("/ready", async (c) => {
    const ok = await deepCheck(redis)
    if (ok) return c.json({ status: "ok" }, 200)
    return c.json(
      {
        status: "error",
        message: "redis function library 'apollon' missing or unreachable",
      },
      503
    )
  })

  return router
}
