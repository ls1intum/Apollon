import { MultilineText, StyledRect } from "@/components"
import { maxLinesForHeight } from "@/utils/svgTextLayout"
import { useDiagramStore } from "@/store"
import { useShallow } from "zustand/shallow"
import AssessmentIcon from "../../AssessmentIcon"
import { SVGComponentProps } from "@/types/SVG"
import { ReachabilityGraphMarkingProps } from "@/types"
import { getCustomColorsFromData } from "@/utils"
import { LAYOUT, MARKER_BASE_SIZE, MARKERS } from "@/constants"

type ReachabilityGraphMarkingSVGProps = SVGComponentProps & {
  data: ReachabilityGraphMarkingProps
}

/**
 * Corner radius of the rounded rectangle used for reachability graph markings.
 */
const CORNER_RADIUS = 10

/**
 * Calculate the exact point where a 45-degree line from (-∞,-∞) toward (0,0)
 * intersects the rounded corner arc of the rectangle.
 *
 * The arc is centered at (rx, ry) with the given radius. For a line traveling
 * at 45° (direction (1,1)), parametrized as (-L+t, -L+t), the intersection is:
 *   t = L + rx - rx/sqrt(2)  (choosing the exterior intersection)
 *   → point = (rx - rx/sqrt(2), ry - ry/sqrt(2))
 *
 * For rx=ry=10: ≈ (2.929, 2.929)
 */
function getArrowTipOnRoundedCorner(rx: number, ry: number) {
  const offset = 1 / Math.SQRT2 // cos(45°) = sin(45°)
  return {
    x: rx - rx * offset,
    y: ry - ry * offset,
  }
}

/**
 * Compute the inline arrowhead path for the initial marking arrow.
 * Replicates the "black-arrow" (open V-shape) marker from InlineMarker,
 * oriented at 45° toward the rounded corner.
 */
function getInitialArrowPath(
  tipX: number,
  tipY: number,
  arrowLength: number,
  arrowHeight: number
) {
  // Direction: 45° (from top-left toward bottom-right)
  const cos = Math.cos(Math.PI / 4)
  const sin = Math.sin(Math.PI / 4)

  // Transform a point relative to the tip, rotated by 45°
  const tx = (x: number, y: number) => Math.round(tipX + x * cos - y * sin)
  const ty = (x: number, y: number) => Math.round(tipY + x * sin + y * cos)

  const halfH = arrowHeight / 2
  // Tip at (0,0), left wing at (-length, -halfH), right wing at (-length, +halfH)
  const tipPx = tx(0, 0)
  const tipPy = ty(0, 0)
  const leftPx = tx(-arrowLength, -halfH)
  const leftPy = ty(-arrowLength, -halfH)
  const rightPx = tx(-arrowLength, halfH)
  const rightPy = ty(-arrowLength, halfH)

  return `M${leftPx},${leftPy} L${tipPx},${tipPy} L${rightPx},${rightPy}`
}

export const ReachabilityGraphMarkingSVG: React.FC<
  ReachabilityGraphMarkingSVGProps
> = ({
  id,
  width,
  height,
  data,
  svgAttributes,
  SIDEBAR_PREVIEW_SCALE,
  showAssessmentResults = false,
}) => {
  const { name, isInitialMarking } = data
  const assessments = useDiagramStore(useShallow((state) => state.assessments))
  const nodeScore = assessments[id]?.score
  const scaledWidth = width * (SIDEBAR_PREVIEW_SCALE ?? 1)
  const scaledHeight = height * (SIDEBAR_PREVIEW_SCALE ?? 1)

  const { fillColor, strokeColor, textColor } = getCustomColorsFromData(data)

  // Compute initial arrow geometry once
  const arrowTip = getArrowTipOnRoundedCorner(CORNER_RADIUS, CORNER_RADIUS)
  const arrowLength = MARKER_BASE_SIZE * 1.0 // widthFactor
  const arrowHeight = MARKER_BASE_SIZE * 0.866 // heightFactor (matches black-arrow)
  const arrowStrokeWidth = MARKERS.STROKE_WIDTH.arrow

  // Arrow line starts well outside the node and ends at the tip
  const arrowStartX = -50
  const arrowStartY = -50

  return (
    <svg
      width={scaledWidth}
      height={scaledHeight}
      viewBox={`0 0 ${width} ${height}`}
      overflow="visible"
      {...svgAttributes}
    >
      <g>
        <StyledRect
          x={0}
          y={0}
          width={width}
          height={height}
          rx={CORNER_RADIUS}
          ry={CORNER_RADIUS}
          fill={fillColor}
          stroke={strokeColor}
        />

        {/* Name Text */}
        <MultilineText
          text={name}
          x={width / 2}
          y={height / 2}
          maxWidth={width - 16}
          fontSize={16}
          fontWeight="600"
          fill={textColor}
          maxLines={maxLinesForHeight(height - 16, 19)}
        />

        {isInitialMarking && (
          <>
            {/* Arrow shaft: line from outside the node to just before the tip */}
            <line
              x1={arrowStartX}
              y1={arrowStartY}
              x2={arrowTip.x}
              y2={arrowTip.y}
              strokeWidth={LAYOUT.LINE_WIDTH_EDGE}
              stroke={strokeColor}
            />
            {/* Inline arrowhead (open V-shape, matching "black-arrow" marker) */}
            <path
              d={getInitialArrowPath(
                arrowTip.x,
                arrowTip.y,
                arrowLength,
                arrowHeight
              )}
              fill="none"
              stroke={strokeColor}
              strokeWidth={arrowStrokeWidth}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </>
        )}
      </g>

      {showAssessmentResults && (
        <AssessmentIcon x={width - 15} y={-15} score={nodeScore} />
      )}
    </svg>
  )
}
