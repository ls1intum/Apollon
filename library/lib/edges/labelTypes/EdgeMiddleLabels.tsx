import { IPoint } from "../Connection"
import {
  computeMiddleLabelLayout,
  computeUseCaseLabelLayout,
  type Rect,
} from "@/utils/geometry/edgeLabelLayout"
import { measureTextWidth } from "@/utils/textUtils"
import { FONT_FAMILY } from "@/fontStack"

/** Perpendicular offset (flow px) of a use-case association label off its line. */
const USE_CASE_LABEL_OFFSET = 15

interface EdgeMiddleLabelsProps {
  label?: string | null
  /** The edge's full rendered polyline (orthogonal edges). */
  activePoints?: IPoint[]
  sourcePoint?: IPoint
  targetPoint?: IPoint
  /** Every node the edge routes near, so the label avoids all of them. */
  nodeRects?: Rect[]
  neighborGeometry?: IPoint[][]
  showRelationshipLabels?: boolean
  isUseCasePath?: boolean
  isPetriNet?: boolean
  textColor: string
}

const LABEL_FONT_SIZE = 12

export const EdgeMiddleLabels = ({
  label,
  activePoints,
  sourcePoint,
  targetPoint,
  nodeRects,
  neighborGeometry,
  showRelationshipLabels = false,
  isUseCasePath = false,
  isPetriNet = false,
  textColor,
}: EdgeMiddleLabelsProps) => {
  if (isPetriNet && label === "1") return null

  if (!label || !showRelationshipLabels) return null

  // Diagonal connectors (use-case associations, petri arcs) run through
  // useStraightPathEdge and can sit at any angle, so the label is rotated to
  // lie along the line with a perpendicular offset — the orthogonal side model
  // below does not apply to them.
  if (isUseCasePath && sourcePoint && targetPoint) {
    const { x, y, rotation } = computeUseCaseLabelLayout(
      sourcePoint,
      targetPoint,
      USE_CASE_LABEL_OFFSET
    )

    return (
      <text
        x={x}
        y={y}
        textAnchor="middle"
        dominantBaseline="middle"
        transform={`rotate(${rotation} ${x} ${y})`}
        style={{
          fontSize: "12px",
          fontWeight: 700,
          fill: textColor,
          userSelect: "none",
          pointerEvents: "none",
        }}
        className="nodrag nopan"
      >
        {label}
      </text>
    )
  }

  // Orthogonal edges: hosted on whichever arm + side has room, so the label
  // clears its own other arms, connected nodes, and nearby edges.
  if (!activePoints || activePoints.length < 2) return null
  const placed = computeMiddleLabelLayout({
    renderPoints: activePoints,
    labelText: label,
    fontSize: LABEL_FONT_SIZE,
    // Real ink width (bold), so the scored box matches what renders.
    measuredWidth: measureTextWidth(
      label,
      `700 ${LABEL_FONT_SIZE}px ${FONT_FAMILY}`
    ),
    nodeRects,
    neighborGeometry,
  })

  return (
    <text
      x={placed.x}
      y={placed.y}
      textAnchor={placed.textAnchor}
      dominantBaseline={placed.dominantBaseline}
      style={{
        fontSize: `${LABEL_FONT_SIZE}px`,
        fontWeight: 700,
        fill: textColor,
        userSelect: "none",
        pointerEvents: "none",
      }}
      className="nodrag nopan"
    >
      {label}
    </text>
  )
}
