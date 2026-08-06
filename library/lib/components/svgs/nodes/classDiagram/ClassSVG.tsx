import { ClassNodeElement, ClassNodeProps } from "@/types"
import { LAYOUT } from "@/constants"
import { SeparationLine } from "@/components/svgs/nodes/SeparationLine"
import { HeaderSection } from "../HeaderSection"
import { RowBlockSection } from "../RowBlockSection"
import { useDiagramStore } from "@/store"
import { useShallow } from "zustand/shallow"
import AssessmentIcon from "../../AssessmentIcon"
import { SVGComponentProps } from "@/types/SVG"
import { AssessmentSelectableElement } from "@/components/AssessmentSelectableElement"
import { StyledRect } from "../../StyledElements"
import { getCustomColorsFromData } from "@/utils/layoutUtils"

export type ClassSVGProps = SVGComponentProps & {
  data: ClassNodeProps
}

export const ClassSVG = ({
  id,
  width,
  height,
  SIDEBAR_PREVIEW_SCALE,
  svgAttributes,
  showAssessmentResults = false,
  data,
}: ClassSVGProps) => {
  // Layout constants
  const { attributes, methods, name, stereotype, isAbstract } = data
  const showStereotype = !!stereotype
  const headerHeight = showStereotype
    ? LAYOUT.DEFAULT_HEADER_HEIGHT_WITH_STEREOTYPE
    : LAYOUT.DEFAULT_HEADER_HEIGHT
  const attributeHeight = LAYOUT.DEFAULT_ATTRIBUTE_HEIGHT
  const methodHeight = LAYOUT.DEFAULT_METHOD_HEIGHT
  const padding = LAYOUT.DEFAULT_PADDING

  const assessments = useDiagramStore(useShallow((state) => state.assessments))

  const processElements = (elements: ClassNodeElement[]) =>
    elements.map((el) => {
      const score = assessments[el.id]?.score
      return { ...el, score }
    })

  const processedAttributes = processElements(attributes)
  const processedMethods = processElements(methods)
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
        // The node wrapper rings the whole class; a header ring would double it.
        highlightable={false}
        badge={
          showAssessmentResults ? (
            <AssessmentIcon score={nodeScore} x={width - 15} y={-15} />
          ) : undefined
        }
      >
        <StyledRect
          x={0}
          y={0}
          width={width}
          height={height}
          stroke={strokeColor}
        />

        {/* Header Section */}
        <HeaderSection
          showStereotype={showStereotype}
          stereotype={stereotype}
          name={name}
          width={width}
          headerHeight={headerHeight}
          isAbstract={isAbstract}
          textColor={textColor}
          fill={fillColor}
        />
      </AssessmentSelectableElement>

      {/* The member sections sit OUTSIDE the class's selectable group on
          purpose. SVG paints in document order, so anything inside that group
          is painted before its selection rect — which would put a member's
          assessment badge underneath the mark for the class, since the first
          attribute's badge overhangs into the header band. Members carry their
          own selectable groups, and the node wrapper still handles clicks
          anywhere on the body. */}

      {/* Attributes Section */}
      {attributes.length >= 0 && (
        <>
          {/* Separation Line After Header */}
          <SeparationLine
            y={headerHeight}
            width={width}
            strokeColor={strokeColor}
          />
          <RowBlockSection
            items={processedAttributes}
            padding={padding}
            itemHeight={attributeHeight}
            width={width}
            offsetFromTop={headerHeight}
            showAssessmentResults={showAssessmentResults}
            itemElementType="attribute"
          />
        </>
      )}

      {/* Methods Section */}
      {methods.length >= 0 && (
        <>
          <SeparationLine
            y={headerHeight + attributes.length * attributeHeight}
            width={width}
            strokeColor={strokeColor}
          />
          <RowBlockSection
            items={processedMethods}
            padding={padding}
            itemHeight={methodHeight}
            width={width}
            offsetFromTop={headerHeight + attributes.length * methodHeight}
            showAssessmentResults={showAssessmentResults}
            itemElementType="method"
          />
        </>
      )}
    </svg>
  )
}
