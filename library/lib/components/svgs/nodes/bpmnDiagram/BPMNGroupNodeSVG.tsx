import { CustomText } from "@/components"
import { LAYOUT } from "@/constants"
import { useDiagramStore } from "@/store"
import { SVGComponentProps } from "@/types/SVG"
import { useShallow } from "zustand/shallow"
import AssessmentIcon from "../../AssessmentIcon"
import { DefaultNodeProps } from "@/types"
import { getCustomColorsFromData } from "@/utils/layoutUtils"

interface BPMNGroupNodeSVGProps extends SVGComponentProps {
  data: DefaultNodeProps
}

export const BPMNGroupNodeSVG: React.FC<BPMNGroupNodeSVGProps> = ({
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

  const { strokeColor, textColor } = getCustomColorsFromData(data)
  const fillColor = data.fillColor || "none"
  return (
    <svg
      width={scaledWidth}
      height={scaledHeight}
      viewBox={`0 0 ${width} ${height}`}
      overflow="visible"
      {...svgAttributes}
    >
      <rect
        x={0}
        y={0}
        width={width}
        height={height}
        stroke={strokeColor}
        strokeWidth={LAYOUT.LINE_WIDTH}
        fill={fillColor}
        strokeDasharray="4"
        rx={10}
        ry={10}
      />
      <CustomText
        x={width / 2}
        y={height / 2}
        textAnchor="middle"
        dominantBaseline="middle"
        fontWeight="bold"
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
