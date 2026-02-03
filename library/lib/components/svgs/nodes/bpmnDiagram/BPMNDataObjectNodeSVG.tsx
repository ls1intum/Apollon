import { CustomText } from "@/components"
import { LAYOUT } from "@/constants"
import { useDiagramStore } from "@/store"
import { SVGComponentProps } from "@/types/SVG"
import { useShallow } from "zustand/shallow"
import AssessmentIcon from "../../AssessmentIcon"
import { DefaultNodeProps } from "@/types"
import { getCustomColorsFromData } from "@/utils/layoutUtils"

type BPMNDataObjectNodeSVGProps = SVGComponentProps & {
  data: DefaultNodeProps
}

export const BPMNDataObjectNodeSVG: React.FC<BPMNDataObjectNodeSVGProps> = ({
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
  const { fillColor, strokeColor, textColor } = getCustomColorsFromData(data)

  return (
    <svg
      width={scaledWidth}
      height={scaledHeight}
      viewBox={`0 0 ${width} ${height}`}
      overflow="visible"
      {...svgAttributes}
    >
      <path
        d={`M0,0 L0,${height} L${width},${height} L${width},15 L${width - 15},0 L${width - 15},15 L${width},15 L${width - 15},0 L0,0`}
        strokeWidth={LAYOUT.LINE_WIDTH}
        stroke={strokeColor}
        fill={fillColor}
      />
      <CustomText
        x={width / 2}
        y={height + 10}
        textAnchor="middle"
        fontSize={14}
        dominantBaseline="hanging"
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
