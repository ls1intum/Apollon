import { CustomText, StyledRect } from "@/components"
import { LAYOUT } from "@/constants"
import { useDiagramStore } from "@/store"
import { SVGComponentProps } from "@/types/SVG"
import { useShallow } from "zustand/shallow"
import AssessmentIcon from "../../AssessmentIcon"
import { DefaultNodeProps } from "@/types"
import { getCustomColorsFromData } from "@/utils"

interface BPMNPoolNodeSVGProps extends SVGComponentProps {
  data: DefaultNodeProps
}
export const BPMNPoolNodeSVG: React.FC<BPMNPoolNodeSVGProps> = ({
  width,
  height,
  data,
  svgAttributes,
  SIDEBAR_PREVIEW_SCALE,
  id,
  showAssessmentResults = false,
}) => {
  const { name } = data
  const assessments = useDiagramStore(useShallow((state) => state.assessments))
  const nodeScore = assessments[id]?.score
  const scaledWidth = width * (SIDEBAR_PREVIEW_SCALE ?? 1)
  const scaledHeight = height * (SIDEBAR_PREVIEW_SCALE ?? 1)

  const headerWidth = 40

  const { fillColor, strokeColor, textColor } = getCustomColorsFromData(data)

  return (
    <svg
      width={scaledWidth}
      height={scaledHeight}
      viewBox={`0 0 ${width} ${height}`}
      overflow="visible"
      {...svgAttributes}
    >
      {/* Pool outer border */}
      <StyledRect
        x={0}
        y={0}
        width={width}
        height={height}
        fill={fillColor}
        stroke={strokeColor}
      />

      {/* Pool header separator line */}
      <line
        x1={headerWidth}
        y1={0}
        x2={headerWidth}
        y2={height}
        stroke={strokeColor}
        strokeWidth={LAYOUT.LINE_WIDTH}
      />

      {/* Pool name in header */}
      <CustomText
        x={headerWidth / 2}
        y={height / 2}
        textAnchor="middle"
        transform={`rotate(-90, ${headerWidth / 2}, ${height / 2})`}
        fill={textColor}
      >
        {name}
      </CustomText>

      {showAssessmentResults && (
        <AssessmentIcon x={width - 15} y={-15} score={nodeScore} />
      )}
    </svg>
  )
}
