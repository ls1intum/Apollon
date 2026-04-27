import { StereotypeAndName, StyledRect } from "@/components"
import { LAYOUT } from "@/constants"
import { useDiagramStore } from "@/store"
import { useShallow } from "zustand/shallow"
import AssessmentIcon from "../../AssessmentIcon"
import { SVGComponentProps } from "@/types/SVG"
import { DeploymentNodeProps } from "@/types"
import { getCustomColorsFromData } from "@/utils/layoutUtils"

interface Props extends SVGComponentProps {
  data: DeploymentNodeProps
}

export const DeploymentNodeSVG: React.FC<Props> = ({
  id,
  width,
  height,
  svgAttributes,
  SIDEBAR_PREVIEW_SCALE,
  showAssessmentResults = false,
  data,
}) => {
  const { name, stereotype, isComponentHeaderShown } = data
  const hasStereotype =
    !!isComponentHeaderShown && !!stereotype && stereotype.length > 0

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
      <g>
        <g>
          {/* Top face */}
          <path
            d={`M 0 8 l 8 -8 H ${width} l -8 8 Z`}
            strokeWidth={LAYOUT.LINE_WIDTH}
            stroke={strokeColor}
            fill={fillColor}
          />
          {/* Right face */}
          <path
            d={`M ${width} 0 V ${height - 8} l -8 8 V 8 Z`}
            strokeWidth={LAYOUT.LINE_WIDTH}
            stroke={strokeColor}
            fill={fillColor}
          />
          {/* Front face */}
          <StyledRect
            x="0"
            y="8"
            width={width - 8}
            height={height - 8}
            stroke={strokeColor}
            fill={fillColor}
          />
        </g>

        <StereotypeAndName
          name={name}
          stereotype={stereotype}
          showStereotype={hasStereotype}
          width={width}
          height={height}
          sideReserve={24}
          verticalAnchor="top"
          nameTextDecoration="underline"
          fill={textColor}
        />
      </g>

      {showAssessmentResults && (
        <AssessmentIcon x={width - 15} y={-15} score={nodeScore} />
      )}
    </svg>
  )
}
