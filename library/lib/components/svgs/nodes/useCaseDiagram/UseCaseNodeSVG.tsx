import { CustomText } from "@/components"
import { LAYOUT } from "@/constants"
import { useDiagramStore } from "@/store"
import { useShallow } from "zustand/shallow"
import AssessmentIcon from "../../AssessmentIcon"
import { SVGComponentProps } from "@/types/SVG"
import { DefaultNodeProps } from "@/types"
import { getCustomColorsFromData } from "@/utils/layoutUtils"
import { layoutTextInEllipse } from "@/utils/svgTextLayout"
import { useMemo } from "react"

interface Props extends SVGComponentProps {
  data: DefaultNodeProps
}

// Text style for the use-case label. Explicit sizing so both pretext's canvas
// measurement and the SVG renderer stay in sync. 16px matches the browser's
// SVG default and the rest of the library's un-sized <text> rendering.
const LABEL_FONT_SIZE = 16
const LABEL_FONT_WEIGHT = 600
const LABEL_LINE_HEIGHT = Math.round(LABEL_FONT_SIZE * 1.2)
// Asymmetric ellipse padding: wider horizontally (where glyphs hit the curve
// at a glancing angle) than vertically (where the curve is closer to the
// label's cap/descender). Prevents text from kissing the outline.
const ELLIPSE_PADDING_X = 8
const ELLIPSE_PADDING_Y = 6

export const UseCaseNodeSVG: React.FC<Props> = ({
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
      layoutTextInEllipse(
        name,
        width,
        height,
        {
          fontSize: LABEL_FONT_SIZE,
          fontWeight: LABEL_FONT_WEIGHT,
        },
        LABEL_LINE_HEIGHT,
        {
          paddingX: ELLIPSE_PADDING_X,
          paddingY: ELLIPSE_PADDING_Y,
        }
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
        <ellipse
          cx={centerX}
          cy={centerY}
          rx={width / 2}
          ry={height / 2}
          fill={fillColor}
          stroke={strokeColor}
          strokeWidth={LAYOUT.LINE_WIDTH}
        />

        {layout.lines.length > 0 && (
          <CustomText
            x={centerX}
            y={centerY}
            textAnchor="middle"
            fontSize={LABEL_FONT_SIZE}
            fontWeight={String(LABEL_FONT_WEIGHT)}
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
