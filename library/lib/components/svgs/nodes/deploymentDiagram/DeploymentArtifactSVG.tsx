import { MultilineText, StyledRect } from "@/components"
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

        {/* Name Text — anchor top so wrapping grows downward from the
            original single-line baseline near y=25. Max width leaves room
            for the artifact icon in the top-right corner. */}
        <MultilineText
          text={name}
          x={width / 2}
          y={15}
          maxWidth={width - 60}
          fontSize={16}
          fontWeight="bold"
          fill={textColor}
          verticalAnchor="top"
        />
      </g>

      {showAssessmentResults && (
        <AssessmentIcon x={width - 15} y={-15} score={nodeScore} />
      )}
    </svg>
  )
}
