import { CustomText, StyledRect } from "@/components"
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

        {/* Name Text */}
        <CustomText
          x="50%"
          y={30}
          textAnchor="middle"
          fontWeight="bold"
          dominantBaseline="middle"
          fill={textColor}
        >
          {isComponentHeaderShown && stereotype.length > 0 ? (
            <>
              <tspan x="50%" dy="-8" fontSize="85%">
                {`«${stereotype}»`}
              </tspan>
              <tspan x="50%" dy="18" textDecoration="underline">
                {name}
              </tspan>
            </>
          ) : (
            <tspan x="50%" dy="0" textDecoration="underline">
              {name}
            </tspan>
          )}
        </CustomText>
      </g>

      {showAssessmentResults && (
        <AssessmentIcon x={width - 15} y={-15} score={nodeScore} />
      )}
    </svg>
  )
}
