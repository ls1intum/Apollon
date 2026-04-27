import { StereotypeAndName, StyledRect } from "@/components"
import { LAYOUT } from "@/constants"
import { useDiagramStore } from "@/store"
import { useShallow } from "zustand/shallow"
import AssessmentIcon from "../../AssessmentIcon"
import { SVGComponentProps } from "@/types/SVG"
import { DeploymentComponentProps } from "@/types"
import { getCustomColorsFromData } from "@/utils/layoutUtils"

interface Props extends SVGComponentProps {
  data: DeploymentComponentProps
}

export const DeploymentComponentSVG: React.FC<Props> = ({
  id,
  width,
  height,
  svgAttributes,
  SIDEBAR_PREVIEW_SCALE,
  showAssessmentResults = false,
  data,
}) => {
  const { name, isComponentHeaderShown } = data
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
        <StyledRect
          x={0}
          y={0}
          width={width}
          height={height}
          stroke={strokeColor}
          fill={fillColor}
        />

        {/* Component Icon */}
        <g transform={`translate(${width - 32}, 8)`}>
          <path
            d="M 4.8 0 L 24 0 L 24 24 L 4.8 24 L 4.8 19.2 L 0 19.2 L 0 14.4 L 4.8 14.4 L 4.8 9.6 L 0 9.6 L 0 4.8 L 4.8 4.8 Z"
            strokeWidth={LAYOUT.ICON_LINE_WIDTH}
            strokeMiterlimit="10"
            stroke={strokeColor}
            fill={fillColor}
          />
          <path
            d="M 4.8 4.8 L 9.6 4.8 L 9.6 9.6 L 4.8 9.6 M 4.8 14.4 L 9.6 14.4 L 9.6 19.2 L 4.8 19.2"
            strokeWidth={LAYOUT.ICON_LINE_WIDTH}
            strokeMiterlimit="10"
            stroke={strokeColor}
            fill="none"
          />
        </g>

        <StereotypeAndName
          name={name}
          stereotype="component"
          showStereotype={!!isComponentHeaderShown}
          width={width}
          height={height}
          fill={textColor}
        />
      </g>

      {showAssessmentResults && (
        <AssessmentIcon x={width - 15} y={-15} score={nodeScore} />
      )}
    </svg>
  )
}
