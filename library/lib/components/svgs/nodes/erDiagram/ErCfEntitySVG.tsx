import { ErCfColumn, ErCfEntityProps } from "@/types"
import { LAYOUT } from "@/constants"
import { SeparationLine } from "@/components/svgs/nodes/SeparationLine"
import { HeaderSection } from "../HeaderSection"
import { ErCfRowSection } from "./ErCfRowSection"
import { useDiagramStore } from "@/store"
import { useShallow } from "zustand/shallow"
import AssessmentIcon from "../../AssessmentIcon"
import { SVGComponentProps } from "@/types/SVG"
import { AssessmentSelectableElement } from "@/components/AssessmentSelectableElement"
import { StyledRect } from "../../StyledElements"
import { getCustomColorsFromData } from "@/utils/layoutUtils"

export type ErCfEntitySVGProps = SVGComponentProps & {
  data: ErCfEntityProps
}

// Crow's-foot (Mermaid-style) entity — a table box with the entity name in the
// header and its attributes as rows. Structurally a one-compartment class, so it
// reuses the class diagram's HeaderSection / RowBlockSection renderers.
export const ErCfEntitySVG = ({
  id,
  width,
  height,
  SIDEBAR_PREVIEW_SCALE,
  svgAttributes,
  showAssessmentResults = false,
  data,
}: ErCfEntitySVGProps) => {
  const { attributes, name } = data
  const headerHeight = LAYOUT.DEFAULT_HEADER_HEIGHT
  const attributeHeight = LAYOUT.DEFAULT_ATTRIBUTE_HEIGHT
  const padding = LAYOUT.DEFAULT_PADDING

  const assessments = useDiagramStore(useShallow((state) => state.assessments))
  const processedAttributes = attributes.map((el: ErCfColumn) => ({
    ...el,
    score: assessments[el.id]?.score,
  }))
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
      <AssessmentSelectableElement
        elementId={id}
        width={width}
        itemHeight={headerHeight}
        yOffset={0}
      >
        <StyledRect
          x={0}
          y={0}
          width={width}
          height={height}
          stroke={strokeColor}
        />

        <HeaderSection
          showStereotype={false}
          name={name}
          width={width}
          headerHeight={headerHeight}
          textColor={textColor}
          fill={fillColor}
        />

        <SeparationLine
          y={headerHeight}
          width={width}
          strokeColor={strokeColor}
        />
        <ErCfRowSection
          columns={processedAttributes}
          padding={padding}
          itemHeight={attributeHeight}
          width={width}
          offsetFromTop={headerHeight}
          showAssessmentResults={showAssessmentResults}
        />

        {showAssessmentResults && (
          <AssessmentIcon score={nodeScore} x={width - 15} y={-15} />
        )}
      </AssessmentSelectableElement>
    </svg>
  )
}
