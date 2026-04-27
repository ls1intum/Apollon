import { useDiagramStore } from "@/store"
import { useShallow } from "zustand/shallow"
import AssessmentIcon from "../../AssessmentIcon"
import { SVGComponentProps } from "@/types/SVG"
import { CustomText, StyledRect } from "@/components"
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
  // Petri-net convention: the label is a single line rendered below the
  // shape and is allowed to extend horizontally past the node footprint.
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

      <CustomText
        x={width / 2}
        y={height + labelHeight / 2}
        textAnchor="middle"
        fontWeight="600"
        dominantBaseline="middle"
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
