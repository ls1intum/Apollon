import { MultilineText } from "@/components"
import { LAYOUT } from "@/constants"
import { useDiagramStore } from "@/store"
import { useShallow } from "zustand/shallow"
import AssessmentIcon from "../../AssessmentIcon"
import { SVGComponentProps } from "@/types/SVG"
import { DefaultNodeProps } from "@/types"
import { getCustomColorsFromData } from "@/utils"
import { maxLinesForHeight } from "@/utils/svgTextLayout"

interface Props extends SVGComponentProps {
  data: DefaultNodeProps
}

// Fixed size of the stick figure itself, in SVG user units. The figure is
// always drawn at these exact pixel dimensions regardless of how the user
// resizes the node — only the surrounding bounding box and the label area
// grow. Matches the convention used by StarUML / Visual Paradigm / yEd.
const FIGURE_WIDTH = 90
const FIGURE_HEIGHT = 110
const LABEL_FONT_SIZE = 16
const LABEL_LINE_HEIGHT = Math.round(LABEL_FONT_SIZE * 1.2)
// Gap between the figure's feet (y = FIGURE_HEIGHT) and the top of the
// label, so the label doesn't kiss the feet line.
const LABEL_TOP_GAP = 8

export const UseCaseActorNodeSVG: React.FC<Props> = ({
  id,
  width,
  height,
  data,
  svgAttributes,
  SIDEBAR_PREVIEW_SCALE,
  showAssessmentResults = false,
}) => {
  const { name } = data
  const assessments = useDiagramStore(useShallow((state) => state.assessments))
  const nodeScore = assessments[id]?.score
  const scaledWidth = width * (SIDEBAR_PREVIEW_SCALE ?? 1)
  const scaledHeight = height * (SIDEBAR_PREVIEW_SCALE ?? 1)

  const { fillColor, strokeColor, textColor } = getCustomColorsFromData(data)

  // Use SVG user units == pixel coordinates so the stick figure and the
  // label stay at a constant pixel size. The figure is horizontally
  // centered in whatever width the user resizes to; the label sits just
  // below the figure at `y = FIGURE_HEIGHT + LABEL_TOP_GAP`.
  const figureOffsetX = Math.max(0, (width - FIGURE_WIDTH) / 2)
  const labelAreaTop = FIGURE_HEIGHT + LABEL_TOP_GAP
  const labelFirstLineCenter = labelAreaTop + LABEL_LINE_HEIGHT / 2
  const labelAreaHeight = Math.max(LABEL_LINE_HEIGHT, height - labelAreaTop)
  const labelMaxLines = maxLinesForHeight(labelAreaHeight, LABEL_LINE_HEIGHT)

  return (
    <svg
      width={scaledWidth}
      height={scaledHeight}
      viewBox={`0 0 ${width} ${height}`}
      overflow="visible"
      {...svgAttributes}
    >
      {/* Stick figure at fixed pixel size, horizontally centered. */}
      <g
        transform={`translate(${figureOffsetX}, 0)`}
        strokeWidth={LAYOUT.LINE_WIDTH}
        stroke={strokeColor}
      >
        <circle cx={45} cy={25} r={15} fill={fillColor} />
        <line x1={45} y1={40} x2={45} y2={80} />
        <line x1={15} y1={55} x2={75} y2={55} />
        <line x1={45} y1={80} x2={15} y2={110} />
        <line x1={45} y1={80} x2={75} y2={110} />
      </g>

      {/* Label at fixed font size, below the figure, wraps to node width. */}
      <MultilineText
        text={name}
        x={width / 2}
        y={labelFirstLineCenter}
        maxWidth={width}
        fontSize={LABEL_FONT_SIZE}
        fontWeight="bold"
        lineHeight={LABEL_LINE_HEIGHT}
        fill={textColor}
        verticalAnchor="top"
        maxLines={labelMaxLines}
      />

      {showAssessmentResults && (
        <AssessmentIcon x={width - 15} y={-15} score={nodeScore} />
      )}
    </svg>
  )
}
