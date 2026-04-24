import { useDiagramStore } from "@/store"
import { useShallow } from "zustand/shallow"
import AssessmentIcon from "../../AssessmentIcon"
import { SVGComponentProps } from "@/types/SVG"
import { MultilineText, StyledRect } from "@/components"
import { DefaultNodeProps } from "@/types"
import { LAYOUT } from "@/constants"
import { getCustomColorsFromData } from "@/utils/layoutUtils"

interface Props extends SVGComponentProps {
  data: DefaultNodeProps
}

export const PetriNetTransitionSVG: React.FC<Props> = ({
  id,
  svgAttributes,
  SIDEBAR_PREVIEW_SCALE,
  showAssessmentResults = false,
  width,
  height,
  data,
}) => {
  const { name } = data
  const assessments = useDiagramStore(useShallow((state) => state.assessments))
  const nodeScore = assessments[id]?.score
  const previewScale = SIDEBAR_PREVIEW_SCALE ?? 1
  const scaledWidth = width * previewScale
  const scaledHeight = height * previewScale
  const labelHeight = LAYOUT.DEFAULT_ATTRIBUTE_HEIGHT
  const scaledLabelHeight = labelHeight * previewScale
  const svgHeight = height + labelHeight
  const scaledSvgHeight = scaledHeight + scaledLabelHeight

  const { fillColor, strokeColor, textColor } = getCustomColorsFromData(data)
  return (
    <svg
      width={scaledWidth}
      height={scaledSvgHeight}
      viewBox={`0 0 ${width} ${svgHeight}`}
      overflow="visible"
      {...svgAttributes}
    >
      <StyledRect
        x={0}
        y={0}
        width={width}
        height={height}
        fill={fillColor}
        stroke={strokeColor}
      />

      {/* Label sits in the fixed-height strip below the rectangle. Wrap
          against the shape width so long names break under the shape. */}
      <MultilineText
        text={name}
        x={width / 2}
        y={height + labelHeight / 2}
        maxWidth={Math.max(width, 80)}
        fontSize={16}
        fontWeight="600"
        fill={textColor}
      />

      {showAssessmentResults && (
        <AssessmentIcon x={width - 15} y={-15} score={nodeScore} />
      )}
    </svg>
  )
}
