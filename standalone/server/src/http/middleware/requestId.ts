import { createMiddleware } from "hono/factory"
import { randomUUID } from "node:crypto"
import type { AppEnv } from "../env.js"

const HEADER = "x-request-id"

/**
 * Assigns a correlation id to every request: honours an inbound `x-request-id`
 * (capped at 128 chars) or mints a UUID, stashes it on the context for the
 * logger / error handler to read, and echoes it on the response.
 */
export function requestId() {
  return createMiddleware<AppEnv>(async (c, next) => {
    const incoming = c.req.header(HEADER)
    const id = incoming && incoming.length <= 128 ? incoming : randomUUID()
    c.set("requestId", id)
    c.header(HEADER, id)
    await next()
  })
}
