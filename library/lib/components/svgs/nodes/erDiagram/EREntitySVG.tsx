import { useDiagramStore } from "@/store"
import { useShallow } from "zustand/shallow"
import AssessmentIcon from "../../AssessmentIcon"
import { SVGComponentProps } from "@/types/SVG"
import { CustomText } from "../CustomText"
import { LAYOUT } from "@/constants"
import { ErEntityProps } from "@/types"
import { ErEntityKind } from "@/types"
import { getCustomColorsFromData } from "@/utils"

interface Props extends SVGComponentProps {
  data: ErEntityProps
}

// Gap between the outer and inner rectangle of a weak (double-border) entity.
const WEAK_BORDER_INSET = 4

export const EREntitySVG: React.FC<Props> = ({
  id,
  svgAttributes,
  SIDEBAR_PREVIEW_SCALE,
  showAssessmentResults = false,
  data,
  width,
  height,
}) => {
  const { name } = data
  const isWeak = data.kind === ErEntityKind.Weak
  const assessments = useDiagramStore(useShallow((state) => state.assessments))
  const nodeScore = assessments[id]?.score
  const previewScale = SIDEBAR_PREVIEW_SCALE ?? 1
  const scaledWidth = width * previewScale
  const scaledHeight = height * previewScale

  const { fillColor, strokeColor, textColor } = getCustomColorsFromData(data)

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
        fill={fillColor}
        stroke={strokeColor}
        strokeWidth={LAYOUT.LINE_WIDTH}
      />

      {isWeak && (
        <rect
          x={WEAK_BORDER_INSET}
          y={WEAK_BORDER_INSET}
          width={width - 2 * WEAK_BORDER_INSET}
          height={height - 2 * WEAK_BORDER_INSET}
          fill="none"
          stroke={strokeColor}
          strokeWidth={LAYOUT.LINE_WIDTH}
        />
      )}

      <CustomText
        x={width / 2}
        y={height / 2}
        textAnchor="middle"
        dominantBaseline="middle"
        fontWeight="600"
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
