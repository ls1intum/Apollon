import React from "react"
import { IPoint } from "./types"

export type SegmentOrientation = "H" | "V"

export interface SegmentProps {
  start: IPoint
  end: IPoint
  orientation: SegmentOrientation
  onPointerDown?: (e: React.PointerEvent<SVGLineElement>) => void
  onPointerMove?: (e: React.PointerEvent<SVGLineElement>) => void
  onPointerUp?: (e: React.PointerEvent<SVGLineElement>) => void
  onPointerCancel?: (e: React.PointerEvent<SVGLineElement>) => void
  stroke?: string
  strokeWidth?: number
  strokeDasharray?: string
  markerEnd?: string
  markerStart?: string
  /**
   * Controls whether the hit-area overlay shows a resize cursor and accepts
   * pointer events. Defaults to true. Pass false in read-only mode so the
   * visual matches what the user can actually do.
   */
  interactive?: boolean
}

export const Segment: React.FC<SegmentProps> = ({
  start,
  end,
  orientation,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
  stroke = "black",
  strokeWidth = 1,
  strokeDasharray,
  markerEnd,
  markerStart,
  interactive = true,
}) => {
  return (
    <g className="orthogonal-segment">
      {/* Visible thin line */}
      <line
        x1={start.x}
        y1={start.y}
        x2={end.x}
        y2={end.y}
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeDasharray={strokeDasharray}
        markerEnd={markerEnd}
        markerStart={markerStart}
        pointerEvents="none"
        data-visible="true"
      />
      {/* Transparent thick overlay for reliable hit detection and interaction.
          When non-interactive, drop pointer events and cursor entirely so the
          visual matches what the user can actually do. */}
      <line
        x1={start.x}
        y1={start.y}
        x2={end.x}
        y2={end.y}
        stroke="transparent"
        strokeWidth={20}
        cursor={
          interactive
            ? orientation === "H"
              ? "row-resize"
              : "col-resize"
            : undefined
        }
        pointerEvents={interactive ? undefined : "none"}
        onPointerDown={interactive ? onPointerDown : undefined}
        onPointerMove={interactive ? onPointerMove : undefined}
        onPointerUp={interactive ? onPointerUp : undefined}
        onPointerCancel={interactive ? onPointerCancel : undefined}
      />
    </g>
  )
}
