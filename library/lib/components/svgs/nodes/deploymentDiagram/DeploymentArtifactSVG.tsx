import { MultilineText, StyledRect } from "@/components"
import { maxLinesForHeight } from "@/utils/svgTextLayout"
import { LAYOUT } from "@/constants"
import { useDiagramStore } from "@/store"
import { useShallow } from "zustand/shallow"
import AssessmentIcon from "../../AssessmentIcon"
import { SVGComponentProps } from "@/types/SVG"
import { DefaultNodeProps } from "@/types"
import { getCustomColorsFromData } from "@/utils/layoutUtils"

interface Props extends SVGComponentProps {
  data: DefaultNodeProps
}

export const DeploymentArtifactSVG: React.FC<Props> = ({
  id,
  width,
  height,
  svgAttributes,
  SIDEBAR_PREVIEW_SCALE,
  showAssessmentResults = false,
  data,
}) => {
  const { name } = data
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

        {/* Artifact Icon - Document-like representation */}
        <g transform={`translate(${width - 25}, 7)`}>
          <path
            d="M 0 0 L 13 0 L 19.2 7.25 L 19.2 24 L 0 24 L 0 0 Z"
            strokeWidth={LAYOUT.ICON_LINE_WIDTH}
            strokeMiterlimit="10"
            stroke={strokeColor}
            fill={fillColor}
          ></path>
          <path
            d="M 13 0 L 13 7.25 L 19.2 7.25"
            strokeWidth={LAYOUT.ICON_LINE_WIDTH}
            strokeMiterlimit="10"
            stroke={strokeColor}
            fill="none"
          ></path>
        </g>

        {/* Name Text — anchor the first line's center at the original
            single-line y=25 and grow downward. Max width leaves room for
            the artifact icon in the top-right corner; max lines are
            capped to what fits in the node's actual height (single line
            at the default 50px, more as the user resizes). */}
        <MultilineText
          text={name}
          x={width / 2}
          y={25}
          maxWidth={width - 60}
          fontSize={16}
          fontWeight="bold"
          fill={textColor}
          verticalAnchor="top"
          maxLines={maxLinesForHeight(height - 16, 19)}
        />
      </g>

      {showAssessmentResults && (
        <AssessmentIcon x={width - 15} y={-15} score={nodeScore} />
      )}
    </svg>
  )
}
