/**
 * SVG Path Parsing Utilities
 *
 * Parses SVG path commands to extract endpoint positions and directions.
 * Used by InlineMarker to correctly position and orient edge markers.
 *
 * Supports all SVG path commands including relative coordinates.
 */

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

export interface Point {
  readonly x: number
  readonly y: number
}

export interface PathEndInfo {
  /** The endpoint coordinates */
  readonly endPoint: Point
  /** Direction angle in radians (from previous point to endpoint) */
  readonly direction: number
}

export interface PathStartInfo {
  /** The start point coordinates */
  readonly startPoint: Point
  /** Direction angle in radians (pointing into the start, away from second point) */
  readonly direction: number
}

/* -------------------------------------------------------------------------- */
/* Path Command Parsing                                                       */
/* -------------------------------------------------------------------------- */

/**
 * Tokenize an SVG path string into individual commands.
 * Handles both uppercase (absolute) and lowercase (relative) commands.
 */
function tokenizePathCommands(pathD: string): string[] {
  if (!pathD) return []
  // Match command letter followed by all content until next command
  return pathD.match(/[MmLlHhVvCcSsQqTtAaZz][^MmLlHhVvCcSsQqTtAaZz]*/g) ?? []
}

/**
 * Parse numeric parameters from a command string.
 */
function parseParams(paramString: string): number[] {
  // Handle various number formats: integers, decimals, negatives, scientific notation
  const matches = paramString.match(/-?\d*\.?\d+(?:[eE][-+]?\d+)?/g)
  return matches ? matches.map(Number).filter((n) => !isNaN(n)) : []
}

/**
 * Calculate the direction angle from point A to point B.
 */
export function calculateDirection(from: Point, to: Point): number {
  return Math.atan2(to.y - from.y, to.x - from.x)
}

/* -------------------------------------------------------------------------- */
/* Path End Info Extraction                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Extract endpoint information from an SVG path.
 *
 * Parses the path to find the final position and the direction of approach.
 * The direction is calculated from the control point (or previous point) to the endpoint.
 *
 * @param pathD - SVG path data string (e.g., "M0,0 L100,100")
 * @returns Endpoint info or null if path is invalid
 */
export function getPathEndInfo(pathD: string): PathEndInfo | null {
  const commands = tokenizePathCommands(pathD)
  if (commands.length === 0) return null

  let currentX = 0
  let currentY = 0
  let startX = 0 // For 'Z' command
  let startY = 0
  let prevX = 0
  let prevY = 0

  // Track last control point for smooth curves
  let lastControlX = 0
  let lastControlY = 0
  let lastCommandType = ""

  for (const cmd of commands) {
    const type = cmd[0]
    const isRelative = type === type.toLowerCase()
    const absType = type.toUpperCase()
    const params = parseParams(cmd.slice(1))

    // Save previous position for direction calculation
    prevX = currentX
    prevY = currentY

    switch (absType) {
      case "M": // MoveTo
        if (params.length >= 2) {
          if (isRelative) {
            currentX += params[0]
            currentY += params[1]
          } else {
            currentX = params[0]
            currentY = params[1]
          }
          startX = currentX
          startY = currentY
          // Handle implicit LineTo commands after MoveTo
          for (let i = 2; i + 1 < params.length; i += 2) {
            prevX = currentX
            prevY = currentY
            if (isRelative) {
              currentX += params[i]
              currentY += params[i + 1]
            } else {
              currentX = params[i]
              currentY = params[i + 1]
            }
          }
        }
        break

      case "L": // LineTo
        for (let i = 0; i + 1 < params.length; i += 2) {
          prevX = currentX
          prevY = currentY
          if (isRelative) {
            currentX += params[i]
            currentY += params[i + 1]
          } else {
            currentX = params[i]
            currentY = params[i + 1]
          }
        }
        break

      case "H": // Horizontal LineTo
        for (const x of params) {
          prevX = currentX
          prevY = currentY
          currentX = isRelative ? currentX + x : x
        }
        break

      case "V": // Vertical LineTo
        for (const y of params) {
          prevX = currentX
          prevY = currentY
          currentY = isRelative ? currentY + y : y
        }
        break

      case "C": // Cubic Bezier (x1 y1 x2 y2 x y)
        for (let i = 0; i + 5 < params.length; i += 6) {
          prevX = currentX
          prevY = currentY
          // For direction, use last control point (x2, y2)
          lastControlX = isRelative ? currentX + params[i + 2] : params[i + 2]
          lastControlY = isRelative ? currentY + params[i + 3] : params[i + 3]
          currentX = isRelative ? currentX + params[i + 4] : params[i + 4]
          currentY = isRelative ? currentY + params[i + 5] : params[i + 5]
          // Use control point for direction
          prevX = lastControlX
          prevY = lastControlY
        }
        break

      case "S": // Smooth Cubic Bezier (x2 y2 x y)
        for (let i = 0; i + 3 < params.length; i += 4) {
          prevX = currentX
          prevY = currentY
          lastControlX = isRelative ? currentX + params[i] : params[i]
          lastControlY = isRelative ? currentY + params[i + 1] : params[i + 1]
          currentX = isRelative ? currentX + params[i + 2] : params[i + 2]
          currentY = isRelative ? currentY + params[i + 3] : params[i + 3]
          prevX = lastControlX
          prevY = lastControlY
        }
        break

      case "Q": // Quadratic Bezier (x1 y1 x y)
        for (let i = 0; i + 3 < params.length; i += 4) {
          prevX = currentX
          prevY = currentY
          lastControlX = isRelative ? currentX + params[i] : params[i]
          lastControlY = isRelative ? currentY + params[i + 1] : params[i + 1]
          currentX = isRelative ? currentX + params[i + 2] : params[i + 2]
          currentY = isRelative ? currentY + params[i + 3] : params[i + 3]
          prevX = lastControlX
          prevY = lastControlY
        }
        break

      case "T": // Smooth Quadratic Bezier (x y)
        for (let i = 0; i + 1 < params.length; i += 2) {
          prevX = currentX
          prevY = currentY
          // Reflect previous control point
          if (lastCommandType === "Q" || lastCommandType === "T") {
            lastControlX = 2 * currentX - lastControlX
            lastControlY = 2 * currentY - lastControlY
          } else {
            lastControlX = currentX
            lastControlY = currentY
          }
          currentX = isRelative ? currentX + params[i] : params[i]
          currentY = isRelative ? currentY + params[i + 1] : params[i + 1]
          prevX = lastControlX
          prevY = lastControlY
        }
        break

      case "A": // Arc (rx ry x-axis-rotation large-arc-flag sweep-flag x y)
        for (let i = 0; i + 6 < params.length; i += 7) {
          prevX = currentX
          prevY = currentY
          currentX = isRelative ? currentX + params[i + 5] : params[i + 5]
          currentY = isRelative ? currentY + params[i + 6] : params[i + 6]
        }
        break

      case "Z": // ClosePath
        prevX = currentX
        prevY = currentY
        currentX = startX
        currentY = startY
        break
    }

    lastCommandType = absType
  }

  const direction = calculateDirection(
    { x: prevX, y: prevY },
    { x: currentX, y: currentY }
  )

  return {
    endPoint: { x: currentX, y: currentY },
    direction,
  }
}

/* -------------------------------------------------------------------------- */
/* Path Start Info Extraction                                                 */
/* -------------------------------------------------------------------------- */

/**
 * Extract start point information from an SVG path.
 *
 * @param pathD - SVG path data string
 * @returns Start point info or null if path is invalid
 */
export function getPathStartInfo(pathD: string): PathStartInfo | null {
  const commands = tokenizePathCommands(pathD)
  if (commands.length === 0) return null

  let startX = 0
  let startY = 0
  let secondX = 0
  let secondY = 0
  let foundStart = false
  let foundSecond = false

  for (const cmd of commands) {
    const type = cmd[0]
    const isRelative = type === type.toLowerCase()
    const absType = type.toUpperCase()
    const params = parseParams(cmd.slice(1))

    if (!foundStart && absType === "M" && params.length >= 2) {
      startX = params[0]
      startY = params[1]
      foundStart = true

      // Check for implicit LineTo within MoveTo
      if (params.length >= 4) {
        secondX = isRelative ? startX + params[2] : params[2]
        secondY = isRelative ? startY + params[3] : params[3]
        foundSecond = true
        break
      }
      continue
    }

    if (foundStart && !foundSecond) {
      switch (absType) {
        case "L":
          if (params.length >= 2) {
            secondX = isRelative ? startX + params[0] : params[0]
            secondY = isRelative ? startY + params[1] : params[1]
            foundSecond = true
          }
          break
        case "H":
          if (params.length >= 1) {
            secondX = isRelative ? startX + params[0] : params[0]
            secondY = startY
            foundSecond = true
          }
          break
        case "V":
          if (params.length >= 1) {
            secondX = startX
            secondY = isRelative ? startY + params[0] : params[0]
            foundSecond = true
          }
          break
        case "C":
          if (params.length >= 6) {
            // Use first control point for direction estimation
            secondX = isRelative ? startX + params[0] : params[0]
            secondY = isRelative ? startY + params[1] : params[1]
            foundSecond = true
          }
          break
        case "Q":
          if (params.length >= 4) {
            secondX = isRelative ? startX + params[0] : params[0]
            secondY = isRelative ? startY + params[1] : params[1]
            foundSecond = true
          }
          break
        case "A":
          if (params.length >= 7) {
            secondX = isRelative ? startX + params[5] : params[5]
            secondY = isRelative ? startY + params[6] : params[6]
            foundSecond = true
          }
          break
      }

      if (foundSecond) break
    }
  }

  if (!foundStart || !foundSecond) return null

  // Direction points INTO the start (away from second point)
  const direction = calculateDirection(
    { x: secondX, y: secondY },
    { x: startX, y: startY }
  )

  return {
    startPoint: { x: startX, y: startY },
    direction,
  }
}

/* -------------------------------------------------------------------------- */
/* Marker URL Extraction                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Extract marker ID from a url() reference.
 *
 * @example
 * extractMarkerId("url(#black-arrow)") // "black-arrow"
 * extractMarkerId("url('#my-marker')") // "my-marker"
 * extractMarkerId(undefined) // null
 */
export function extractMarkerId(markerUrl: string | undefined): string | null {
  if (!markerUrl) return null
  const match = markerUrl.match(/url\(['"]?#?([^'")\s]+)['"]?\)/)
  return match?.[1] ?? null
}
