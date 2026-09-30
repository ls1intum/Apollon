import { IPoint } from "../Connection"
import {
  computeMiddleLabelLayout,
  computeUseCaseLabelLayout,
  type Rect,
} from "@/utils/geometry/edgeLabelLayout"
import { measureTextWidth } from "@/utils/textUtils"
import { FONT_FAMILY } from "@/fontStack"
import { EDGES } from "@/utils/geometry/routingConstants"

/** Perpendicular offset (flow px) of a use-case association label off its line. */
const USE_CASE_LABEL_OFFSET = 15

interface EdgeMiddleLabelsProps {
  label?: string | null
  /**
   * Optional lines stacked under the label: a bracketed technology marker and a
   * description, the two things a deployment or C4 relation says about itself
   * beyond its name. Both render nothing when absent.
   */
  technology?: string | null
  description?: string | null
  /** The edge's full rendered polyline (orthogonal edges). */
  activePoints?: IPoint[]
  sourcePoint?: IPoint
  targetPoint?: IPoint
  anchorPoint?: IPoint
  /** Every node the edge routes near, so the label avoids all of them. */
  nodeRects?: Rect[]
  neighborGeometry?: IPoint[][]
  showRelationshipLabels?: boolean
  isUseCasePath?: boolean
  isPetriNet?: boolean
  textColor: string
}

const LABEL_FONT_SIZE = 12
const SUBLABEL_FONT_SIZE = 10

type LabelLine = {
  text: string
  fontSize: number
  fontWeight: number
  fontStyle: "normal" | "italic"
}

/**
 * The label block, top line first. The name is bold at full size and the two
 * detail lines are smaller, so a relation reads as one thing with an
 * annotation rather than three competing labels.
 */
const buildLines = (
  label?: string | null,
  technology?: string | null,
  description?: string | null
): LabelLine[] => {
  const lines: LabelLine[] = []
  if (label?.trim()) {
    lines.push({
      text: label,
      fontSize: LABEL_FONT_SIZE,
      fontWeight: 700,
      fontStyle: "normal",
    })
  }
  if (technology?.trim()) {
    lines.push({
      text: `[${technology.trim()}]`,
      fontSize: SUBLABEL_FONT_SIZE,
      fontWeight: 400,
      fontStyle: "italic",
    })
  }
  if (description?.trim()) {
    lines.push({
      text: description.trim(),
      fontSize: SUBLABEL_FONT_SIZE,
      fontWeight: 400,
      fontStyle: "normal",
    })
  }
  return lines
}

/**
 * Where the block's first line sits, given the anchor [computeMiddleLabelLayout]
 * returned for a single-line label.
 *
 * The anchor means a different thing on each side — a baseline above the arm, a
 * top edge below it, a vertical centre beside it — so a block has to grow in the
 * direction that keeps it off the line: upwards from an "above" anchor, downwards
 * from "below", and split either way when it sits to one side.
 */
const firstLineY = (
  y: number,
  side: "above" | "below" | "left" | "right",
  lineCount: number
): number => {
  const span = (lineCount - 1) * EDGES.LABEL_LINE_HEIGHT
  if (side === "above") return y - span
  if (side === "below") return y
  return y - span / 2
}

export const EdgeMiddleLabels = ({
  label,
  technology,
  description,
  activePoints,
  sourcePoint,
  targetPoint,
  anchorPoint,
  nodeRects,
  neighborGeometry,
  showRelationshipLabels = false,
  isUseCasePath = false,
  isPetriNet = false,
  textColor,
}: EdgeMiddleLabelsProps) => {
  if (isPetriNet && label === "1") return null

  if (!showRelationshipLabels) return null
  const lines = buildLines(label, technology, description)
  if (lines.length === 0) return null

  // Diagonal connectors (use-case associations, petri arcs) run through
  // useStraightPathEdge and can sit at any angle, so the label is rotated to
  // lie along the line with a perpendicular offset — the orthogonal side model
  // below does not apply to them.
  if (isUseCasePath && sourcePoint && targetPoint) {
    const { x, y, rotation } = computeUseCaseLabelLayout(
      sourcePoint,
      targetPoint,
      USE_CASE_LABEL_OFFSET,
      anchorPoint
    )

    return (
      <text
        x={x}
        y={y}
        textAnchor="middle"
        dominantBaseline="central"
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
    labelText: lines[0].text,
    fontSize: LABEL_FONT_SIZE,
    // Real ink width, so the scored box matches what renders. The widest line
    // wins: the block is centred, so any narrower line sits inside that box.
    measuredWidth: Math.max(
      ...lines.map((line) =>
        measureTextWidth(
          line.text,
          `${line.fontWeight} ${line.fontSize}px ${FONT_FAMILY}`
        )
      )
    ),
    nodeRects,
    neighborGeometry,
    lineCount: lines.length,
  })

  const top = firstLineY(placed.y, placed.side, lines.length)

  return (
    <text
      x={placed.x}
      y={placed.y}
      textAnchor={placed.textAnchor}
      dominantBaseline={placed.dominantBaseline}
      style={{
        fill: textColor,
        userSelect: "none",
        pointerEvents: "none",
      }}
      className="nodrag nopan"
    >
      {/* Each tspan repeats x, y and the baseline: WebKit resolves
          dominant-baseline per positioning run, so a tspan carrying its own y
          falls back to the alphabetic baseline without it. See CustomText. */}
      {lines.map((line, index) => (
        <tspan
          key={index}
          x={placed.x}
          y={top + index * EDGES.LABEL_LINE_HEIGHT}
          dominantBaseline={placed.dominantBaseline}
          fontSize={line.fontSize}
          fontWeight={line.fontWeight}
          fontStyle={line.fontStyle}
        >
          {line.text}
        </tspan>
      ))}
    </text>
  )
}
