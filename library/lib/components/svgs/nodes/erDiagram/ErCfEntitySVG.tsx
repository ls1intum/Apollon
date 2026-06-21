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
import { getCustomColorsFromData, measureTextWidth } from "@/utils"

export type ErCfEntitySVGProps = SVGComponentProps & {
  data: ErCfEntityProps
}

// Crow's-foot (Mermaid / IE-style) entity — a table with a shaded title band and
// aligned columns: a key gutter (PK/FK/UK), the column name, and a muted data
// type. Mirrors how Mermaid, dbdiagram and DrawSQL render an entity table.
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
  const { strokeColor, textColor } = getCustomColorsFromData(data)

  const maxNameWidth = Math.max(
    0,
    ...attributes.map((a) => measureTextWidth(a.name, LAYOUT.DEFAULT_FONT))
  )
  // Shaded title band so the entity name reads as a table header. A user-set
  // fill is honoured; otherwise the subtle theme surface var is used.
  const headerFill =
    data.fillColor || "var(--apollon-background-variant, #f8f9fa)"

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
          fill={headerFill}
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
          maxNameWidth={maxNameWidth}
          showAssessmentResults={showAssessmentResults}
        />

        {showAssessmentResults && (
          <AssessmentIcon score={nodeScore} x={width - 15} y={-15} />
        )}
      </AssessmentSelectableElement>
    </svg>
  )
}
