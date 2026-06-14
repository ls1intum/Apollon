import {
  extractMarkerId,
  getMarkerHalfHeight,
  InlineMarker,
} from "@/components/svgs/edges"
import { MARKER_CONFIGS, type MarkerId } from "@/constants"
import { getEdgeMarkerStyles } from "@/utils/edgeUtils"

// A miniature of how an edge type renders on the canvas, shown next to each
// option in the edge-type dropdown. Markers reuse the canvas's own
// `getEdgeMarkerStyles` + `InlineMarker`, so the glyphs can't drift from real
// edges. The line only signals solid vs dashed — its dash pattern is sized for
// the preview, not the canvas's pixel length.

const VIEW_W = 56
const VIEW_H = 28
const MID_Y = VIEW_H / 2
// Marker tips sit at END_X; arrow/triangle/rhombus grow leftward, the interface
// socket rightward, so END_X leaves room both ways.
const START_X = 6
const END_X = 44
// Largest marker half-height that fits the row with a little breathing room.
const MAX_MARKER_HALF_HEIGHT = MID_Y - 3

// Markers are sized for the canvas (the interface socket especially is
// node-scale), so anything taller than the row is scaled down to fit.
const fitScale = (markerId: MarkerId): number =>
  Math.min(1, MAX_MARKER_HALF_HEIGHT / getMarkerHalfHeight(markerId))

const toMarkerId = (raw: string | null): MarkerId | null =>
  raw !== null && raw in MARKER_CONFIGS ? (raw as MarkerId) : null

// Renders a marker at the given anchor, shrunk to fit the row. Scaling about
// the anchor keeps the tip on the line.
const FittedMarker = ({
  markerId,
  anchorX,
  direction,
}: {
  markerId: MarkerId
  anchorX: number
  direction: number
}) => {
  const scale = fitScale(markerId)
  const marker = (
    <InlineMarker
      endPoint={{ x: anchorX, y: MID_Y }}
      direction={direction}
      markerId={markerId}
      strokeColor="currentColor"
    />
  )
  if (scale === 1) return marker
  return (
    <g
      transform={`translate(${anchorX} ${MID_Y}) scale(${scale}) translate(${-anchorX} ${-MID_Y})`}
    >
      {marker}
    </g>
  )
}

export const EdgeTypePreviewIcon = ({ edgeType }: { edgeType: string }) => {
  const { markerEnd, markerStart, strokeDashArray } =
    getEdgeMarkerStyles(edgeType)
  const dashed = strokeDashArray !== undefined && strokeDashArray !== "0"
  const endMarkerId = toMarkerId(extractMarkerId(markerEnd))
  const startMarkerId = toMarkerId(extractMarkerId(markerStart))

  return (
    <svg
      aria-hidden
      focusable="false"
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      style={{
        width: VIEW_W,
        height: VIEW_H,
        flex: "0 0 auto",
        overflow: "visible",
      }}
    >
      <line
        x1={START_X}
        y1={MID_Y}
        x2={END_X}
        y2={MID_Y}
        stroke="currentColor"
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeDasharray={dashed ? "4 3" : undefined}
      />
      {endMarkerId && (
        <FittedMarker markerId={endMarkerId} anchorX={END_X} direction={0} />
      )}
      {startMarkerId && (
        <FittedMarker
          markerId={startMarkerId}
          anchorX={START_X}
          direction={Math.PI}
        />
      )}
    </svg>
  )
}
