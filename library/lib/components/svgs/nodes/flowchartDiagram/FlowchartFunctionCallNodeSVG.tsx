import { MultilineText, StyledRect } from "@/components"
import { maxLinesForHeight } from "@/utils/svgTextLayout"
import { LAYOUT } from "@/constants"
import { useDiagramStore } from "@/store"
import { useShallow } from "zustand/shallow"
import AssessmentIcon from "../../AssessmentIcon"
import { SVGComponentProps } from "@/types/SVG"
import { DefaultNodeProps } from "@/types/nodes/NodeProps"
import { getCustomColorsFromData } from "@/utils/layoutUtils"

interface Props extends SVGComponentProps {
  data: DefaultNodeProps
}
export const FlowchartFunctionCallNodeSVG: React.FC<Props> = ({
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

  return (
    <svg
      width={scaledWidth}
      height={scaledHeight}
      viewBox={`0 0 ${width} ${height}`}
      overflow="visible"
      {...svgAttributes}
    >
      <g>
        {/* Rectangle with double left and right borders for predefined process */}
        <StyledRect
          x={0}
          y={0}
          width={width}
          height={height}
          fill={fillColor}
          stroke={strokeColor}
        />

        {/* Left vertical line */}
        <line
          x1={10}
          y1={0}
          x2={10}
          y2={height}
          stroke={strokeColor}
          strokeWidth={LAYOUT.LINE_WIDTH}
        />

        {/* Right vertical line */}
        <line
          x1={width - 10}
          y1={0}
          x2={width - 10}
          y2={height}
          stroke={strokeColor}
          strokeWidth={LAYOUT.LINE_WIDTH}
        />

        {/* Name Text — inner rectangle sits between the double vertical
            lines at x=10 and x=width-10, so wrap inside that area. */}
        <MultilineText
          text={name}
          x={width / 2}
          y={height / 2}
          maxWidth={width - 36}
          fontSize={16}
          fontWeight="600"
          fill={textColor}
          maxLines={maxLinesForHeight(height - 16, 19)}
        />
      </g>

      {showAssessmentResults && (
        <AssessmentIcon x={width - 15} y={-15} score={nodeScore} />
      )}
    </svg>
  )
}
