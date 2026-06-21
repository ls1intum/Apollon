import { useDiagramStore } from "@/store"
import { useShallow } from "zustand/shallow"
import AssessmentIcon from "../../AssessmentIcon"
import { SVGComponentProps } from "@/types/SVG"
import { CustomText } from "../CustomText"
import { DEFAULT_FONT_SIZE, LAYOUT } from "@/constants"
import { ErAttributeProps } from "@/types"
import { getCustomColorsFromData, measureTextWidth } from "@/utils"

interface Props extends SVGComponentProps {
  data: ErAttributeProps
}

// Gap between the outer and inner ellipse of a multivalued attribute.
const MULTIVALUED_INSET = 4

export const ERAttributeSVG: React.FC<Props> = ({
  id,
  svgAttributes,
  SIDEBAR_PREVIEW_SCALE,
  showAssessmentResults = false,
  data,
  width,
  height,
}) => {
  const { name, isKey, isPartialKey, isMultivalued, isDerived } = data
  const assessments = useDiagramStore(useShallow((state) => state.assessments))
  const nodeScore = assessments[id]?.score
  const previewScale = SIDEBAR_PREVIEW_SCALE ?? 1
  const scaledWidth = width * previewScale
  const scaledHeight = height * previewScale

  const cx = width / 2
  const cy = height / 2
  const rx = width / 2 - LAYOUT.LINE_WIDTH
  const ry = height / 2 - LAYOUT.LINE_WIDTH

  const { fillColor, strokeColor, textColor } = getCustomColorsFromData(data)

  // Key = solid underline, partial key (discriminator) = dashed underline. A
  // true key outranks a partial key if both are somehow set. Drawn as an
  // explicit <line> rather than CSS text-decoration because resvg (the PNG/PDF
  // export renderer) does not honour text-decoration on <text>.
  const showUnderline = isKey || isPartialKey
  const underlineHalfWidth = Math.min(rx - 4, measureTextWidth(name) / 2)
  const underlineY = cy + DEFAULT_FONT_SIZE * 0.6

  return (
    <svg
      width={scaledWidth}
      height={scaledHeight}
      viewBox={`0 0 ${width} ${height}`}
      overflow="visible"
      {...svgAttributes}
    >
      <ellipse
        cx={cx}
        cy={cy}
        rx={rx}
        ry={ry}
        fill={fillColor}
        stroke={strokeColor}
        strokeWidth={LAYOUT.LINE_WIDTH}
        strokeDasharray={isDerived ? "6 4" : undefined}
      />

      {isMultivalued && (
        <ellipse
          cx={cx}
          cy={cy}
          rx={rx - MULTIVALUED_INSET}
          ry={ry - MULTIVALUED_INSET}
          fill="none"
          stroke={strokeColor}
          strokeWidth={LAYOUT.LINE_WIDTH}
          strokeDasharray={isDerived ? "6 4" : undefined}
        />
      )}

      <CustomText
        x={cx}
        y={cy}
        textAnchor="middle"
        dominantBaseline="middle"
        fill={textColor}
      >
        {name}
      </CustomText>

      {showUnderline && (
        <line
          x1={cx - underlineHalfWidth}
          x2={cx + underlineHalfWidth}
          y1={underlineY}
          y2={underlineY}
          stroke={textColor}
          strokeWidth={1.5}
          strokeDasharray={isKey ? undefined : "3 2"}
        />
      )}

      {showAssessmentResults && (
        <AssessmentIcon x={width - 15} y={-15} score={nodeScore} />
      )}
    </svg>
  )
}
