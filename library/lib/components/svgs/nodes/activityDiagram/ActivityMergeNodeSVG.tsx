import { CustomText } from "@/components"
import { LAYOUT } from "@/constants"
import { useDiagramStore } from "@/store"
import { useShallow } from "zustand/shallow"
import AssessmentIcon from "../../AssessmentIcon"
import { SVGComponentProps } from "@/types/SVG"
import { DefaultNodeProps } from "@/types"
import { getCustomColorsFromData } from "@/utils"
import { layoutTextInDiamond } from "@/utils/svgTextLayout"
import { useMemo } from "react"

type Props = SVGComponentProps & {
  data: DefaultNodeProps
}

const LABEL_FONT_SIZE = 16
const LABEL_FONT_WEIGHT = "bold"
const LABEL_LINE_HEIGHT = Math.round(LABEL_FONT_SIZE * 1.2)
const DIAMOND_PADDING_X = 8
const DIAMOND_PADDING_Y = 6

export const ActivityMergeNodeSVG: React.FC<Props> = ({
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

  const layout = useMemo(
    () =>
      layoutTextInDiamond(
        name,
        width,
        height,
        { fontSize: LABEL_FONT_SIZE, fontWeight: LABEL_FONT_WEIGHT },
        LABEL_LINE_HEIGHT,
        { paddingX: DIAMOND_PADDING_X, paddingY: DIAMOND_PADDING_Y }
      ),
    [name, width, height]
  )

  const centerX = width / 2
  const centerY = height / 2

  return (
    <svg
      width={scaledWidth}
      height={scaledHeight}
      viewBox={`0 0 ${width} ${height}`}
      overflow="visible"
      {...svgAttributes}
    >
      <g>
        <polyline
          points={`
              ${width / 2},0
              ${width},${height / 2}
              ${width / 2},${height}
              0,${height / 2}
              ${width / 2},0`}
          fill={fillColor}
          stroke={strokeColor}
          strokeWidth={LAYOUT.LINE_WIDTH}
        />

        {/* Merge condition label — diamond-aware wrapping truncates
            with an ellipsis if the label does not fit. */}
        {layout.lines.length > 0 && (
          <CustomText
            x={centerX}
            y={centerY}
            textAnchor="middle"
            fontSize={LABEL_FONT_SIZE}
            fontWeight={LABEL_FONT_WEIGHT}
            dominantBaseline="middle"
            fill={textColor}
          >
            {layout.lines.map((line, index) => (
              <tspan
                key={index}
                x={centerX}
                y={centerY + layout.lineOffsets[index]}
              >
                {line.text}
              </tspan>
            ))}
          </CustomText>
        )}
      </g>

      {showAssessmentResults && (
        <AssessmentIcon x={width - 15} y={-15} score={nodeScore} />
      )}
    </svg>
  )
}
