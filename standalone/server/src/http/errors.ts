import type { ApiErrorCode } from "../types"

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
  notFound: (msg = "Not found") => new ApiError(404, "NOT_FOUND", msg),
  noHead: (msg = "Diagram does not exist") => new ApiError(404, "NO_HEAD", msg),
  revisionMismatch: (currentHeadRev: number) =>
    new ApiError(
      409,
      "REVISION_MISMATCH",
      "If-Match revision does not match current headRev",
      { currentHeadRev }
    ),
  internal: (msg = "Internal server error") =>
    new ApiError(500, "INTERNAL", msg),
}
