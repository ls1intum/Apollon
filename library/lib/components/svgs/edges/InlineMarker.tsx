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
}

const isMarkerId = (id: string): id is keyof typeof MARKER_CONFIGS =>
  id in MARKER_CONFIGS

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
          fill={filled ? strokeColor : FILL_COLOR}
          stroke={strokeColor}
          strokeWidth={strokeW}
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
          fill={filled ? strokeColor : FILL_COLOR}
          stroke={strokeColor}
          strokeWidth={strokeW}
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
          data-inline-marker="true"
        />
      )
    }

    case "semicircle": {
      const strokeW = MARKERS.STROKE_WIDTH.semicircle
      // Socket radius = Ball radius + gap for visual separation
      // Gap of 7 adds extra clearance between socket arc and interface circle:
      //   circle outer edge = RADIUS + strokeWidth/2 = 15 + 1 = 16
      //   arc inner edge = (RADIUS + gap) - arcStrokeWidth/2 = 22 - 1 = 21
      //   With gap=7, the arc inner edge sits 5px away from the circle
      const gap = 7
      const r = INTERFACE.RADIUS + gap // 15 + 7 = 22

      // Use config's arcSpanDegrees (180° for half, 90° for quarter, 270° for three-quarter)
      const arcSpanDegrees = config.arcSpanDegrees ?? 180
      const halfAngle = ((arcSpanDegrees / 2) * Math.PI) / 180
      const cosHalf = Math.cos(halfAngle)
      const sinHalf = Math.sin(halfAngle)

      // large-arc-flag must be 1 when arc span > 180° (SVG arc command requirement)
      const largeArcFlag = arcSpanDegrees > 180 ? 1 : 0

      const transformExact = (x: number, y: number) => ({
        x: endPoint.x + x * cos - y * sin,
        y: endPoint.y + x * sin + y * cos,
      })

      const top = transformExact(r * (1 - cosHalf), -r * sinHalf)
      const bottom = transformExact(r * (1 - cosHalf), r * sinHalf)

      // sweep=0 (counterclockwise): arc curves AWAY from direction of travel,
      // so the concave opening faces TOWARD the ball
      return (
        <path
          d={`M${top.x},${top.y} A${r},${r} 0 ${largeArcFlag},0 ${bottom.x},${bottom.y}`}
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
}: {
  pathD: string
  markerEnd?: string
  markerStart?: string
  strokeColor?: string
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
