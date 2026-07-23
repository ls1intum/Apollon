/**
 * InlineMarker Component
 *
 * Renders marker shapes as actual path elements instead of using <marker> references.
 * This ensures markers survive "Break Apart" in Keynote and "Ungroup" in PowerPoint,
 * which don't preserve <marker> elements.
 */

import {
  FILL_COLOR,
  INTERFACE,
  MARKERS,
  MARKER_CONFIGS,
  STROKE_COLOR,
} from "@/constants"
import {
  getPathEndInfo as getPathEndInfoFromParser,
  getPathStartInfo as getPathStartInfoFromParser,
  extractMarkerId as extractMarkerIdFromParser,
} from "@/utils/pathParsing"

export interface MarkerProps {
  /** The endpoint where the marker should be drawn */
  endPoint: { x: number; y: number }
  /** The direction angle in radians (from previous point to endpoint) */
  direction: number
  /** The marker type ID */
  markerId: string
  /** Optional stroke color override */
  strokeColor?: string
  /**
   * Geometry of the provided-interface ball this socket terminates at.
   * Supplying the actual node geometry keeps imported 20px interfaces and
   * current 30px interfaces equally concentric.
   */
  interfaceGeometry?: InterfaceGeometry
}

export interface InterfaceGeometry {
  center: { x: number; y: number }
  radius: number
}

const isMarkerId = (id: string): id is keyof typeof MARKER_CONFIGS =>
  id in MARKER_CONFIGS

const THEME_BACKGROUND_COLOR = "var(--apollon-background, #ffffff)"

/**
 * Native (canvas-scale) half-height of a marker's bounding box. The single
 * place marker vertical extent is derived from MARKER_CONFIGS, so callers that
 * place or scale a marker (e.g. inline dropdown previews) stay in sync with how
 * `InlineMarker` actually draws it.
 */
export function getMarkerHalfHeight(
  markerId: keyof typeof MARKER_CONFIGS,
  interfaceRadius = INTERFACE.RADIUS
) {
  const config = MARKER_CONFIGS[markerId]
  if (config.type === "semicircle") {
    const radius = interfaceRadius + INTERFACE.SOCKET_GAP
    // Once the arc spans past ±90° its extent is the full radius; clamp so a
    // >180° arc (e.g. the three-quarter socket) isn't under-measured.
    const span = Math.min(config.arcSpanDegrees ?? 180, 180)
    return radius * Math.sin((span / 2) * (Math.PI / 180))
  }
  if (config.type === "circle") return config.size / 2
  return (config.size * config.heightFactor) / 2
}

/**
 * Resolve a required-interface socket around the exact center of its provided
 * interface. The path endpoint and the ball boundary are normally identical,
 * but the center is authoritative so RF handle padding and legacy node sizes
 * can never introduce a visible eccentricity.
 */
export function getInterfaceSocketGeometry({
  endPoint,
  direction,
  interfaceGeometry,
  arcSpanDegrees,
}: {
  endPoint: { x: number; y: number }
  direction: number
  interfaceGeometry?: InterfaceGeometry
  arcSpanDegrees: number
}) {
  const cos = Math.cos(direction)
  const sin = Math.sin(direction)
  const ballRadius = interfaceGeometry?.radius ?? INTERFACE.RADIUS
  const center = interfaceGeometry?.center ?? {
    x: endPoint.x + ballRadius * cos,
    y: endPoint.y + ballRadius * sin,
  }
  const radius = ballRadius + INTERFACE.SOCKET_GAP
  const halfAngle = ((arcSpanDegrees / 2) * Math.PI) / 180
  const cosHalf = Math.cos(halfAngle)
  const sinHalf = Math.sin(halfAngle)
  const aroundCenter = (x: number, y: number) => ({
    x: center.x + x * cos - y * sin,
    y: center.y + x * sin + y * cos,
  })

  return {
    center,
    radius,
    top: aroundCenter(-radius * cosHalf, -radius * sinHalf),
    bottom: aroundCenter(-radius * cosHalf, radius * sinHalf),
    largeArcFlag: arcSpanDegrees > 180 ? 1 : 0,
  }
}

/**
 * Extract marker ID from a url() reference.
 * e.g., "url(#black-arrow)" -> "black-arrow"
 *
 * Uses the robust implementation from pathParsing.ts that handles
 * all SVG path commands including relative coordinates.
 */
export const extractMarkerId = extractMarkerIdFromParser

/**
 * Calculate endpoint and direction from the last segment of a path.
 *
 * Uses the robust implementation from pathParsing.ts that handles
 * all SVG path commands including relative coordinates and bezier curves.
 */
export function getPathEndInfo(pathD: string): {
  endPoint: { x: number; y: number }
  direction: number
} | null {
  const result = getPathEndInfoFromParser(pathD)
  if (!result) return null
  return {
    endPoint: result.endPoint,
    direction: result.direction,
  }
}

/**
 * Get path start info for marker-start.
 *
 * Uses the robust implementation from pathParsing.ts that handles
 * all SVG path commands including H, V, C, Q, and relative coordinates.
 */
export function getPathStartInfo(pathD: string): {
  startPoint: { x: number; y: number }
  direction: number
} | null {
  const result = getPathStartInfoFromParser(pathD)
  if (!result) return null
  return {
    startPoint: result.startPoint,
    direction: result.direction,
  }
}

/**
 * Renders an inline SVG marker at the given position and direction.
 */
export function InlineMarker({
  endPoint,
  direction,
  markerId,
  strokeColor = STROKE_COLOR,
  interfaceGeometry,
}: MarkerProps) {
  if (!isMarkerId(markerId)) return null
  const config = MARKER_CONFIGS[markerId]

  const { type, filled, size } = config
  const cos = Math.cos(direction)
  const sin = Math.sin(direction)

  // Helper to rotate and translate a point relative to endpoint
  // Round coordinates to whole pixels for pixel-perfect rendering
  // Note: For cardinal directions (0, 90, 180, 270°), Math.cos/sin can return
  // tiny fractional values like 6.123e-17 instead of exact 0, so we round
  const transform = (x: number, y: number) => ({
    x: Math.round(endPoint.x + x * cos - y * sin),
    y: Math.round(endPoint.y + x * sin + y * cos),
  })

  switch (type) {
    case "triangle": {
      const strokeW = MARKERS.STROKE_WIDTH.triangle
      const length = size * (config.widthFactor ?? 1)
      const height = size * (config.heightFactor ?? 1)
      // Tip vertex touches endpoint exactly for pixel-perfect alignment
      // The stroke extends slightly beyond the vertex but that's acceptable
      const tipOffset = 0
      const tip = transform(tipOffset, 0)
      const left = transform(tipOffset - length, -height / 2)
      const right = transform(tipOffset - length, height / 2)
      return (
        <path
          d={`M${tip.x},${tip.y} L${left.x},${left.y} L${right.x},${right.y} Z`}
          fill={filled ? strokeColor : THEME_BACKGROUND_COLOR}
          stroke={strokeColor}
          strokeWidth={strokeW}
          data-inline-marker-filled={filled ? "true" : undefined}
          data-inline-marker="true"
        />
      )
    }

    case "arrow": {
      const strokeW = MARKERS.STROKE_WIDTH.arrow
      const length = size * (config.widthFactor ?? 1)
      const height = size * (config.heightFactor ?? 0.7)

      if (filled) {
        // Filled arrow: tip touches endpoint exactly (visual fill is what matters)
        const tipOffset = 0
        const tip = transform(tipOffset, 0)
        const left = transform(tipOffset - length, -height / 2)
        const right = transform(tipOffset - length, height / 2)
        return (
          <path
            d={`M${left.x},${left.y} L${tip.x},${tip.y} L${right.x},${right.y} Z`}
            fill={strokeColor}
            stroke={strokeColor}
            strokeWidth={strokeW}
            strokeLinecap="round"
            strokeLinejoin="round"
            data-inline-marker-filled="true"
            data-inline-marker="true"
          />
        )
      }
      // Outlined arrow: open V-shape with round linecap
      // Tip touches endpoint exactly - round linecap provides visual extension
      const tipOffset = 0
      const tip = transform(tipOffset, 0)
      const left = transform(tipOffset - length, -height / 2)
      const right = transform(tipOffset - length, height / 2)
      return (
        <path
          d={`M${left.x},${left.y} L${tip.x},${tip.y} L${right.x},${right.y}`}
          fill="none"
          stroke={strokeColor}
          strokeWidth={strokeW}
          strokeLinecap="round"
          strokeLinejoin="round"
          data-inline-marker="true"
        />
      )
    }

    case "rhombus": {
      const strokeW = MARKERS.STROKE_WIDTH.rhombus
      const w = size * (config.widthFactor ?? 1)
      const h = size * (config.heightFactor ?? 1)
      // Tip vertex touches endpoint exactly for pixel-perfect alignment
      // The stroke extends slightly beyond the vertex but that's acceptable
      const tipOffset = 0
      const front = transform(tipOffset, 0)
      const right = transform(tipOffset - w / 2, h / 2)
      const back = transform(tipOffset - w, 0)
      const left = transform(tipOffset - w / 2, -h / 2)
      return (
        <path
          d={`M${front.x},${front.y} L${right.x},${right.y} L${back.x},${back.y} L${left.x},${left.y} Z`}
          fill={filled ? strokeColor : THEME_BACKGROUND_COLOR}
          stroke={strokeColor}
          strokeWidth={strokeW}
          data-inline-marker-filled={filled ? "true" : undefined}
          data-inline-marker="true"
        />
      )
    }

    case "circle": {
      const strokeW = MARKERS.STROKE_WIDTH.circle
      const r = size / 2
      // Offset center backward by radius + half stroke so visible edge touches endpoint
      const center = transform(-r - strokeW / 2, 0)
      return (
        <circle
          cx={center.x}
          cy={center.y}
          r={r}
          fill={filled ? strokeColor : FILL_COLOR}
          stroke={strokeColor}
          strokeWidth={strokeW}
          data-inline-marker-filled={filled ? "true" : undefined}
          data-inline-marker="true"
        />
      )
    }

    case "semicircle": {
      const strokeW = MARKERS.STROKE_WIDTH.semicircle
      // Use config-defined arc span (180° default, 90° quarter, 270° three-quarter)
      const arcSpanDegrees = config.arcSpanDegrees ?? 180
      const { radius, top, bottom, largeArcFlag } = getInterfaceSocketGeometry({
        endPoint,
        direction,
        interfaceGeometry,
        arcSpanDegrees,
      })

      // sweep=0 (counterclockwise): arc curves AWAY from direction of travel,
      // so the concave opening faces TOWARD the ball
      return (
        <path
          d={`M${top.x},${top.y} A${radius},${radius} 0 ${largeArcFlag},0 ${bottom.x},${bottom.y}`}
          fill="none"
          stroke={strokeColor}
          strokeWidth={strokeW}
          data-inline-marker="true"
        />
      )
    }

    default:
      return null
  }
}

/**
 * Helper component that renders inline markers for an edge path.
 * Use this alongside BaseEdge (without markerEnd/markerStart props).
 */
export function EdgeInlineMarkers({
  pathD,
  markerEnd,
  markerStart,
  strokeColor = STROKE_COLOR,
  targetInterfaceGeometry,
}: {
  pathD: string
  markerEnd?: string
  markerStart?: string
  strokeColor?: string
  targetInterfaceGeometry?: InterfaceGeometry
}) {
  const endMarkerId = extractMarkerId(markerEnd)
  const startMarkerId = extractMarkerId(markerStart)

  return (
    <g pointerEvents="none">
      {endMarkerId &&
        (() => {
          const endInfo = getPathEndInfo(pathD)
          if (!endInfo) return null
          return (
            <InlineMarker
              endPoint={endInfo.endPoint}
              direction={endInfo.direction}
              markerId={endMarkerId}
              strokeColor={strokeColor}
              interfaceGeometry={targetInterfaceGeometry}
            />
          )
        })()}

      {startMarkerId &&
        (() => {
          const startInfo = getPathStartInfo(pathD)
          if (!startInfo) return null
          return (
            <InlineMarker
              endPoint={startInfo.startPoint}
              direction={startInfo.direction}
              markerId={startMarkerId}
              strokeColor={strokeColor}
            />
          )
        })()}
    </g>
  )
}
