import { MultilineText } from "@/components"
import { maxLinesForHeight } from "@/utils/svgTextLayout"
import { LAYOUT } from "@/constants"
import { useDiagramStore } from "@/store"
import { SVGComponentProps } from "@/types/SVG"
import { useShallow } from "zustand/shallow"
import AssessmentIcon from "../../AssessmentIcon"
import { getCustomColorsFromData } from "@/utils/layoutUtils"
import { DefaultNodeProps } from "@/types"

type BPMNAnnotationNodeSVGProps = SVGComponentProps & {
  data: DefaultNodeProps
}

export const BPMNAnnotationNodeSVG: React.FC<BPMNAnnotationNodeSVGProps> = ({
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
      <path
        d={`M20,0 L10,0 A 10 10 280 0 0 0 10 L0,${height - 10} A 10 10 180 0 0 10 ${height} L20, ${height}`}
        strokeWidth={LAYOUT.LINE_WIDTH}
        stroke={strokeColor}
        fill={fillColor}
      />
      <rect
        x={19}
        y={0}
        width={width - 20}
        height={height}
        fill={fillColor}
        stroke="none"
        strokeWidth={0}
      />
      <MultilineText
        text={name}
        x={(width + 20) / 2}
        y={height / 2}
        maxWidth={width - 28}
        fontSize={16}
        fontWeight="bold"
        fill={textColor}
        maxLines={maxLinesForHeight(height - 16, 19)}
      />

      {showAssessmentResults && (
        <AssessmentIcon x={width - 15} y={-15} score={nodeScore} />
      )}
    </svg>
  )
}
