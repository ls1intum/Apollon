import { createMiddleware } from "hono/factory"
import type { AppEnv } from "../env.js"
import { logger } from "../../logger.js"

interface HttpLoggerOptions {
  /** When false, per-request logging is suppressed (tests). Default: true. */
  autoLogging?: boolean
}

/**
 * Per-request access logging using the shared pino `logger`. Replaces
 * `pino-http`: it emits one `info` record per completed request with the same
 * `req`/`res` shape pino's serializers produced, so the logger's redact paths
 * (`req.headers.cookie`, `req.headers.authorization`, `res.headers["set-cookie"]`)
 * still apply, and carries the correlation id from the requestId middleware.
 *
 * The record is emitted AFTER `next()` resolves. Hono's `onError` runs inside
 * the dispatch and resolves the chain normally (it does not re-throw), so even
 * error responses unwind back here with `c.res` set to the final status —
 * matching pino-http's "log on response finish, including errors" behaviour.
 */
export function httpLogger({ autoLogging = true }: HttpLoggerOptions = {}) {
  return createMiddleware<AppEnv>(async (c, next) => {
    if (!autoLogging) {
      await next()
      return
    }
    const start = Date.now()
    await next()
    const responseTime = Date.now() - start
    logger.info(
      {
        req: {
          method: c.req.method,
          url: c.req.path,
          headers: Object.fromEntries(c.req.raw.headers),
        },
        res: {
          statusCode: c.res.status,
          headers: Object.fromEntries(c.res.headers),
        },
        responseTime,
        requestId: c.get("requestId"),
      },
      "request completed"
    )
  })
}
