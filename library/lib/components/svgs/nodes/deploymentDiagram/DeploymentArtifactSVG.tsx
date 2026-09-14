import { MultilineText, StyledRect } from "@/components"
import { maxLinesForHeight, wrapTextInRect } from "@/utils/svgTextLayout"
import { LAYOUT } from "@/constants"
import { useDiagramStore } from "@/store"
import { useShallow } from "zustand/shallow"
import { useMemo } from "react"
import AssessmentIcon from "../../AssessmentIcon"
import { NodeSubtext } from "../NodeSubtext"
import { SVGComponentProps } from "@/types/SVG"
import { DeploymentArtifactProps } from "@/types"
import { getCustomColorsFromData } from "@/utils/layoutUtils"

interface Props extends SVGComponentProps {
  data: DeploymentArtifactProps
}

const NAME_TOP_Y = 25

export const DeploymentArtifactSVG: React.FC<Props> = ({
  id,
  width,
  height,
  svgAttributes,
  SIDEBAR_PREVIEW_SCALE,
  showAssessmentResults = false,
  data,
}) => {
  const { name, technology, description } = data
  const assessments = useDiagramStore(useShallow((state) => state.assessments))
  const nodeScore = assessments[id]?.score
  const scaledWidth = width * (SIDEBAR_PREVIEW_SCALE ?? 1)
  const scaledHeight = height * (SIDEBAR_PREVIEW_SCALE ?? 1)
  const { fillColor, strokeColor, textColor } = getCustomColorsFromData(data)

  const nameMaxWidth = width - 60
  const nameMaxLines = maxLinesForHeight(height - 16, LAYOUT.NAME_LINE_HEIGHT)

  // Unlike the node and component shapes, the artifact lays its name out
  // directly rather than through StereotypeAndName, so it has to measure the
  // wrapped name itself to know where the subtext starts.
  const nameLineCount = useMemo(() => {
    if (!name) return 0
    const wrapped = wrapTextInRect(
      name,
      nameMaxWidth,
      { fontSize: LAYOUT.NAME_FONT_SIZE, fontWeight: "bold" },
      { lineHeight: LAYOUT.NAME_LINE_HEIGHT, maxLines: nameMaxLines }
    )
    return Math.max(1, wrapped.lines.length)
  }, [name, nameMaxWidth, nameMaxLines])

  const subtextTop =
    NAME_TOP_Y +
    (nameLineCount - 0.5) * LAYOUT.NAME_LINE_HEIGHT +
    LAYOUT.SUBTEXT_NAME_GAP
  const subtextMaxLines = Math.max(
    0,
    Math.floor((height - 8 - subtextTop) / LAYOUT.SUBTEXT_LINE_HEIGHT)
  )

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
          y={NAME_TOP_Y}
          maxWidth={nameMaxWidth}
          fontSize={LAYOUT.NAME_FONT_SIZE}
          fontWeight="bold"
          fill={textColor}
          verticalAnchor="top"
          maxLines={nameMaxLines}
        />

        <NodeSubtext
          technology={technology}
          description={description}
          x={width / 2}
          y={subtextTop + LAYOUT.SUBTEXT_LINE_HEIGHT / 2}
          maxWidth={nameMaxWidth}
          maxLines={subtextMaxLines}
          fill={textColor}
        />
      </g>

      {showAssessmentResults && (
        <AssessmentIcon x={width - 15} y={-15} score={nodeScore} />
      )}
    </svg>
  )
}
