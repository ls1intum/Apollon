import type { ApiErrorCode } from "../types.js"

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: ApiErrorCode,
    message: string,
    public readonly meta?: Record<string, unknown>
  ) {
    super(message)
    this.name = "ApiError"
  }
}

export const Errors = {
  invalidParams: (msg = "Invalid request parameters") =>
    new ApiError(422, "INVALID_PARAMS", msg),
  // Raised by the bodyLimit middleware when a request body exceeds
  // MAX_SNAPSHOT_BYTES. Routed through the shared error handler so the 413
  // carries the same typed envelope (`error: BODY_TOO_LARGE`) the previous
  // body-parser path produced.
  bodyTooLarge: (msg = "Request body exceeds the configured size limit") =>
    new ApiError(413, "BODY_TOO_LARGE", msg),
  notFound: (msg = "Not found") => new ApiError(404, "NOT_FOUND", msg),
  noHead: (msg = "Diagram does not exist") => new ApiError(404, "NO_HEAD", msg),
  revisionMismatch: (currentHeadRev: number) =>
    new ApiError(
      409,
      "REVISION_MISMATCH",
      "If-Match revision does not match current headRev",
      { currentHeadRev }
    ),
  // Transient render saturation (queue full / worker timeout). `retryAfterSeconds`
  // is surfaced as a real `Retry-After` header by the error handler so Camo and
  // browsers back off instead of caching a hard error.
  rendererBusy: (retryAfterSeconds = 2) =>
    new ApiError(503, "RENDERER_BUSY", "Render pipeline is busy", {
      retryAfterSeconds,
    }),
  internal: (msg = "Internal server error") =>
    new ApiError(500, "INTERNAL", msg),
}
