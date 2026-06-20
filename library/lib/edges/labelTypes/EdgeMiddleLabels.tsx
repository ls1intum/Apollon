import { IPoint } from "../Connection"
import {
  computeMiddleLabelLayout,
  computeUseCaseLabelLayout,
  type Rect,
} from "@/utils/geometry/edgeLabelLayout"

/** Perpendicular offset (flow px) of a use-case association label off its line. */
const USE_CASE_LABEL_OFFSET = 15

interface EdgeMiddleLabelsProps {
  label?: string | null
  pathMiddlePosition: IPoint
  isMiddlePathHorizontal: boolean
  sourcePoint?: IPoint
  targetPoint?: IPoint
  sourceNodeRect?: Rect
  targetNodeRect?: Rect
  neighborGeometry?: IPoint[][]
  showRelationshipLabels?: boolean
  isUseCasePath?: boolean
  isPetriNet?: boolean
  textColor: string
}

export const EdgeMiddleLabels = ({
  label,
  pathMiddlePosition,
  isMiddlePathHorizontal,
  sourcePoint,
  targetPoint,
  sourceNodeRect,
  targetNodeRect,
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

  // Orthogonal edges: centered on top of the mid-segment by default, flipped to
  // the clearer side when the default would land on a connected node.
  const placed = computeMiddleLabelLayout({
    mid: { point: pathMiddlePosition, isHorizontal: isMiddlePathHorizontal },
    sourceNodeRect,
    targetNodeRect,
    neighborGeometry,
  })

  return (
    <text
      x={placed.x}
      y={placed.y}
      textAnchor={placed.textAnchor}
      dominantBaseline={placed.dominantBaseline}
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
