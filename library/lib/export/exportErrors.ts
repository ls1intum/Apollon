/**
 * Typed errors for the raster (PNG) export path so callers can branch on the
 * cause — "diagram too large" vs a generic failure — and show an actionable
 * message instead of the silent 0-byte file the old canvas path produced (#667).
 */

export class RasterTooLargeError extends Error {
  constructor(
    message: string,
    readonly canvasWidth: number,
    readonly canvasHeight: number
  ) {
    super(message)
    this.name = "RasterTooLargeError"
  }
}

export class RasterTimeoutError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "RasterTimeoutError"
  }
}
