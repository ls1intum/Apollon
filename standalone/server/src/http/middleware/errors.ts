import type { ErrorRequestHandler } from "express"
import {
  ClientClosedError,
  ClientOfflineError,
  ConnectionTimeoutError,
  DisconnectsClientError,
  ReconnectStrategyError,
  SocketClosedUnexpectedlyError,
} from "redis"
import { ApiError } from "../errors.js"
import type { ApiErrorBody } from "../../types.js"
import { logger } from "../../logger.js"

/**
 * Maps ApiError → typed error body. Falls back to 500 INTERNAL for unknown
 * errors. Always includes the request ID so support can correlate.
 */
export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  const requestId = req.requestId ?? ""

  // Error responses must never be cached — a 404 is heuristically cacheable by
  // default (RFC 9111 §4.2.2), which would pin a transient miss against a URL.
  res.setHeader("cache-control", "no-store")

  if (err instanceof ApiError) {
    const body: ApiErrorBody = {
      error: err.code,
      message: err.message,
      requestId,
    }
    if (err.meta) {
      // Surface optional metadata (e.g. currentHeadRev on REVISION_MISMATCH).
      Object.assign(body as unknown as Record<string, unknown>, err.meta)
      // A transient 503 carries its backoff as a real header (not just a body
      // field) so Camo/browsers back off.
      const retryAfter = err.meta.retryAfterSeconds
      if (typeof retryAfter === "number") {
        res.setHeader("retry-after", String(retryAfter))
      }
    }
    if (err.status >= 500) {
      logger.error(
        { err, requestId, code: err.code, status: err.status },
        "api.error"
      )
    } else {
      logger.warn(
        { requestId, code: err.code, status: err.status, message: err.message },
        "api.clientError"
      )
    }
    res.status(err.status).json(body)
    return
  }

  // Body-parser tags its error with `err.type === "entity.too.large"` —
  // that's the public contract; the message string can be reworded in any
  // patch release of body-parser without notice.
  const bodyParserType = (err as { type?: string }).type
  const status = (err as { statusCode?: number }).statusCode
  if (bodyParserType === "entity.too.large" || status === 413) {
    const body: ApiErrorBody = {
      error: "BODY_TOO_LARGE",
      message: "Request body exceeds the configured size limit",
      requestId,
    }
    res.status(413).json(body)
    return
  }

  // node-redis raises these when the client is disconnected mid-request,
  // mid-reconnect, or while the reconnect strategy itself fails.
  if (
    err instanceof ClientClosedError ||
    err instanceof ClientOfflineError ||
    err instanceof SocketClosedUnexpectedlyError ||
    err instanceof DisconnectsClientError ||
    err instanceof ConnectionTimeoutError ||
    err instanceof ReconnectStrategyError
  ) {
    const body: ApiErrorBody = {
      error: "REDIS_UNAVAILABLE",
      message: "Storage is temporarily unavailable",
      requestId,
    }
    res.status(503).json(body)
    return
  }

  logger.error({ err, requestId }, "api.unhandled")
  const body: ApiErrorBody = {
    error: "INTERNAL",
    message: "Something went wrong",
    requestId,
  }
  res.status(500).json(body)
}
