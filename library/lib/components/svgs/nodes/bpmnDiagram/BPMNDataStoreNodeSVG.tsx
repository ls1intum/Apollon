import { CustomText } from "@/components"
import { LAYOUT } from "@/constants"
import { useDiagramStore } from "@/store"
import { SVGComponentProps } from "@/types/SVG"
import { useShallow } from "zustand/shallow"
import AssessmentIcon from "../../AssessmentIcon"
import { getCustomColorsFromData } from "@/utils/layoutUtils"
import { DefaultNodeProps } from "@/types"

type BPMNDataStoreNodeSVGProps = SVGComponentProps & {
  data: DefaultNodeProps
}

export const BPMNDataStoreNodeSVG: React.FC<BPMNDataStoreNodeSVGProps> = ({
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
        d={`M 0 10 L 0 ${height - 10} A ${width / 2} 10 0 0 0 ${width} ${
          height - 10
        } L ${width} 10 A ${width / 2} 10 180 0 0 0 10`}
        strokeWidth={LAYOUT.LINE_WIDTH}
        stroke={strokeColor}
        fill={fillColor}
      />
      <path
        d={`M 0 30 A ${width / 2} 10 0 0 0 ${width} 30`}
        strokeWidth={LAYOUT.LINE_WIDTH}
        stroke={strokeColor}
        fill="none"
      />
      <path
        d={`M 0 20 A ${width / 2} 10 0 0 0 ${width} 20`}
        stroke={strokeColor}
        strokeWidth={LAYOUT.LINE_WIDTH}
        fill="none"
      />
      <path
        d={`M 0 10 A ${width / 2} 10 0 0 0 ${width} 10`}
        stroke={strokeColor}
        strokeWidth={LAYOUT.LINE_WIDTH}
        fill="none"
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
