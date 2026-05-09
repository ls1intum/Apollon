/**
 * Typed errors thrown by the client-side export pipeline. The navbar catches
 * these to render actionable toast messages instead of a generic "failed".
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
