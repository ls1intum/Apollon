import { MultilineText } from "@/components"
import { maxLinesForHeight } from "@/utils/svgTextLayout"
import { LAYOUT } from "@/constants"
import { useDiagramStore } from "@/store"
import { useShallow } from "zustand/shallow"
import AssessmentIcon from "../../AssessmentIcon"
import { SVGComponentProps } from "@/types/SVG"
import { DefaultNodeProps } from "@/types/nodes/NodeProps"
import { getCustomColorsFromData } from "@/utils/layoutUtils"

interface Props extends SVGComponentProps {
  data: DefaultNodeProps
}
export const FlowchartInputOutputNodeSVG: React.FC<Props> = ({
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
        {/* Parallelogram shape for input/output */}
        <path
          d={`M20,0 L${width},0 L${width - 20},${height} L0,${height} Z`}
          strokeWidth={LAYOUT.LINE_WIDTH}
          stroke={strokeColor}
          fill={fillColor}
        />

        {/* Name Text — parallelogram slants inward by 20px on each side.
            The 48-px horizontal reserve is an approximation: the true
            inner width varies with y, and a tall multi-line block at
            the top/bottom of the shape can still kiss the slopes. Good
            enough for typical aspect ratios; revisit if reports come in. */}
        <MultilineText
          text={name}
          x={width / 2}
          y={height / 2}
          maxWidth={width - 48}
          fontSize={LAYOUT.NAME_FONT_SIZE}
          fontWeight="600"
          fill={textColor}
          maxLines={maxLinesForHeight(height - 16, LAYOUT.NAME_LINE_HEIGHT)}
        />
      </g>

      {showAssessmentResults && (
        <AssessmentIcon x={width - 15} y={-15} score={nodeScore} />
      )}
    </svg>
  )
}
