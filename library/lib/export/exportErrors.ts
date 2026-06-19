/**
 * Typed error for the raster (PNG) export path so callers can show an
 * actionable "diagram too large" message instead of the silent 0-byte file the
 * old canvas path produced (#667).
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
