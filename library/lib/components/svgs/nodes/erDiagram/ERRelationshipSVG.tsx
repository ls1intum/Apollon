import { useDiagramStore } from "@/store"
import { useShallow } from "zustand/shallow"
import AssessmentIcon from "../../AssessmentIcon"
import { SVGComponentProps } from "@/types/SVG"
import { CustomText } from "../CustomText"
import { LAYOUT } from "@/constants"
import { ErRelationshipProps } from "@/types"
import { ErRelationshipKind } from "@/types"
import { getCustomColorsFromData } from "@/utils"

interface Props extends SVGComponentProps {
  data: ErRelationshipProps
}

// Gap between the outer and inner diamond of an identifying relationship.
// Larger than a rectangle's inset would be: a diamond tapers to points, so a
// uniform perpendicular inset collapses near the tips unless exaggerated.
const IDENTIFYING_INSET = 8

// Diamond polygon points for a box of the given size.
const diamondPoints = (w: number, h: number, inset = 0): string =>
  [
    [inset, h / 2],
    [w / 2, inset],
    [w - inset, h / 2],
    [w / 2, h - inset],
  ]
    .map(([x, y]) => `${x},${y}`)
    .join(" ")

export const ERRelationshipSVG: React.FC<Props> = ({
  id,
  svgAttributes,
  SIDEBAR_PREVIEW_SCALE,
  showAssessmentResults = false,
  data,
  width,
  height,
}) => {
  const { name } = data
  const isIdentifying = data.kind === ErRelationshipKind.Identifying
  const assessments = useDiagramStore(useShallow((state) => state.assessments))
  const nodeScore = assessments[id]?.score
  const previewScale = SIDEBAR_PREVIEW_SCALE ?? 1
  const scaledWidth = width * previewScale
  const scaledHeight = height * previewScale

  const { fillColor, strokeColor, textColor } = getCustomColorsFromData(data)

  return (
    <svg
      width={scaledWidth}
      height={scaledHeight}
      viewBox={`0 0 ${width} ${height}`}
      overflow="visible"
      {...svgAttributes}
    >
      <polygon
        points={diamondPoints(width, height)}
        fill={fillColor}
        stroke={strokeColor}
        strokeWidth={LAYOUT.LINE_WIDTH}
      />

      {isIdentifying && (
        <polygon
          points={diamondPoints(width, height, IDENTIFYING_INSET)}
          fill="none"
          stroke={strokeColor}
          strokeWidth={LAYOUT.LINE_WIDTH}
        />
      )}

      <CustomText
        x={width / 2}
        y={height / 2}
        textAnchor="middle"
        dominantBaseline="middle"
        fontWeight="600"
        fill={textColor}
      >
        {name}
      </CustomText>

      {showAssessmentResults && (
        <AssessmentIcon x={width - 15} y={-15} score={nodeScore} />
      )}
    </svg>
  )
}
