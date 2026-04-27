import { MultilineText } from "@/components"
import { maxLinesForHeight } from "@/utils/svgTextLayout"
import { LAYOUT } from "@/constants"
import { useDiagramStore } from "@/store"
import { useShallow } from "zustand/shallow"
import AssessmentIcon from "../../AssessmentIcon"
import { SVGComponentProps } from "@/types/SVG"
import { DefaultNodeProps } from "@/types"

export type PackageSVGProps = SVGComponentProps & {
  data: DefaultNodeProps
}

const leftTopBoxHeight = 10
const padding = 5

export const PackageSVG: React.FC<PackageSVGProps> = ({
  id,
  width,
  height,
  data,
  svgAttributes,
  SIDEBAR_PREVIEW_SCALE,
  showAssessmentResults = false,
}) => {
  const { name } = data
  const assessments = useDiagramStore(useShallow((state) => state.assessments))
  const nodeScore = assessments[id]?.score

  const scaledWidth = width * (SIDEBAR_PREVIEW_SCALE ?? 1)
  const scaledHeight = height * (SIDEBAR_PREVIEW_SCALE ?? 1)

  const strokeColor =
    data.strokeColor || "var(--apollon-primary-contrast, #000000)"
  const fillColor = data.fillColor || "var(--apollon-background, white)"
  const textColor = data.textColor || "var(--apollon-primary-contrast, #000000)"

  return (
    <svg
      width={scaledWidth}
      height={scaledHeight}
      viewBox={`0 0 ${width} ${height}`}
      overflow="visible"
      {...svgAttributes}
    >
      <g>
        {/* Left-Top Box */}
        <rect
          x={0}
          y={0}
          width={40}
          height={leftTopBoxHeight}
          strokeWidth={LAYOUT.LINE_WIDTH}
          stroke={strokeColor}
          fill={fillColor}
        />

        {/* Main Box */}
        <rect
          x={0}
          y={leftTopBoxHeight}
          width={width}
          height={height - leftTopBoxHeight}
          strokeWidth={LAYOUT.LINE_WIDTH}
          stroke={strokeColor}
          fill={fillColor}
        />

        {/* Name Text — anchored just below the left-top tab. First line's
            center lands a few px below the tab bottom to preserve the
            visible position of the original hanging-baseline layout. */}
        <MultilineText
          text={name}
          x={width / 2}
          y={leftTopBoxHeight + padding + 7}
          maxWidth={width - 24}
          fontSize={LAYOUT.NAME_FONT_SIZE}
          fontWeight="600"
          fill={textColor}
          verticalAnchor="top"
          maxLines={maxLinesForHeight(
            height - leftTopBoxHeight - padding - 16,
            LAYOUT.NAME_LINE_HEIGHT
          )}
        />
      </g>

      {showAssessmentResults && (
        <AssessmentIcon x={width - 15} y={-5} score={nodeScore} />
      )}
    </svg>
  )
}
