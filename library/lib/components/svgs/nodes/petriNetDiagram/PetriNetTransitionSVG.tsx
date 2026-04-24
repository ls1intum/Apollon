import { useDiagramStore } from "@/store"
import { useShallow } from "zustand/shallow"
import AssessmentIcon from "../../AssessmentIcon"
import { SVGComponentProps } from "@/types/SVG"
import { MultilineText, StyledRect } from "@/components"
import { DefaultNodeProps } from "@/types"
import { LAYOUT } from "@/constants"
import { getCustomColorsFromData } from "@/utils/layoutUtils"
import { wrapTextInRect } from "@/utils/svgTextLayout"
import { useMemo } from "react"

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
  const labelLineHeight = 19
  const labelMaxWidth = width
  const labelMaxLines = 3
  const labelLineCount = useMemo(() => {
    const wrapped = wrapTextInRect(
      name ?? "",
      labelMaxWidth,
      { fontSize: 16, fontWeight: 600 },
      { lineHeight: labelLineHeight, maxLines: labelMaxLines }
    )
    return Math.max(1, wrapped.lines.length)
  }, [name, labelMaxWidth, labelLineHeight, labelMaxLines])
  const labelHeight = Math.max(
    LAYOUT.DEFAULT_ATTRIBUTE_HEIGHT,
    labelLineCount * labelLineHeight + 8
  )
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

      {/* Label sits in a strip below the rectangle. The strip auto-sizes
          to the wrapped text so multi-line labels never clip into the
          shape above or overflow outside the SVG element. A soft cap
          at `labelMaxLines` keeps extreme inputs bounded. */}
      <MultilineText
        text={name}
        x={width / 2}
        y={height + labelHeight / 2}
        maxWidth={labelMaxWidth}
        fontSize={16}
        fontWeight={600}
        lineHeight={labelLineHeight}
        fill={textColor}
        maxLines={labelMaxLines}
      />

      {showAssessmentResults && (
        <AssessmentIcon x={width - 15} y={-15} score={nodeScore} />
      )}
    </svg>
  )
}
