import { CustomText, MultilineText, StyledRect } from "@/components"
import { maxLinesForHeight } from "@/utils/svgTextLayout"
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

        {/* Stereotype header (single line by convention) */}
        {isComponentHeaderShown && stereotype && stereotype.length > 0 && (
          <CustomText
            x={width / 2}
            y={22}
            textAnchor="middle"
            fontWeight="bold"
            dominantBaseline="middle"
            fill={textColor}
            fontSize="85%"
          >
            {`«${stereotype}»`}
          </CustomText>
        )}

        {/* Name Text (wrapped) */}
        <MultilineText
          text={name}
          x={width / 2}
          y={
            isComponentHeaderShown && stereotype && stereotype.length > 0
              ? 40
              : 30
          }
          maxWidth={width - 24}
          fontSize={LAYOUT.NAME_FONT_SIZE}
          fontWeight="bold"
          fill={textColor}
          verticalAnchor="top"
          textDecoration="underline"
          maxLines={maxLinesForHeight(
            height -
              (isComponentHeaderShown && stereotype && stereotype.length > 0
                ? 40
                : 20),
            LAYOUT.NAME_LINE_HEIGHT
          )}
        />
      </g>

      {showAssessmentResults && (
        <AssessmentIcon x={width - 15} y={-15} score={nodeScore} />
      )}
    </svg>
  )
}
