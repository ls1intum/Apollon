import { CustomText, MultilineText, StyledRect } from "@/components"
import { maxLinesForHeight, wrapTextInRect } from "@/utils/svgTextLayout"
import { LAYOUT } from "@/constants"
import { useDiagramStore } from "@/store"
import { useShallow } from "zustand/shallow"
import AssessmentIcon from "../../AssessmentIcon"
import { SVGComponentProps } from "@/types/SVG"
import { ComponentNodeProps } from "@/types"
import { getCustomColorsFromData } from "@/utils/layoutUtils"
import { useMemo } from "react"

const NAME_FONT_SIZE = 16
const NAME_LINE_HEIGHT = 19
const STEREOTYPE_LINE_HEIGHT = 15
const STEREOTYPE_NAME_GAP = 4

interface Props extends SVGComponentProps {
  data: ComponentNodeProps
}

export const ComponentNodeSVG: React.FC<Props> = ({
  id,
  width,
  height,
  svgAttributes,
  SIDEBAR_PREVIEW_SCALE,
  showAssessmentResults = false,
  data,
}) => {
  const assessments = useDiagramStore(useShallow((state) => state.assessments))
  const nodeScore = assessments[id]?.score
  const scaledWidth = width * (SIDEBAR_PREVIEW_SCALE ?? 1)
  const scaledHeight = height * (SIDEBAR_PREVIEW_SCALE ?? 1)
  const { name, isComponentHeaderShown } = data

  const { fillColor, strokeColor, textColor } = getCustomColorsFromData(data)

  // Compute the wrapped name up-front so we can center the stereotype
  // header + name as a single visual group, rather than pinning each to
  // fixed offsets that only look right for a one-line name.
  const nameMaxWidth = width - 48
  const nameMaxLines = isComponentHeaderShown
    ? maxLinesForHeight(
        height - STEREOTYPE_LINE_HEIGHT - STEREOTYPE_NAME_GAP - 8,
        NAME_LINE_HEIGHT
      )
    : maxLinesForHeight(height - 16, NAME_LINE_HEIGHT)
  const nameLineCount = useMemo(() => {
    if (!name) return 0
    const wrapped = wrapTextInRect(
      name,
      nameMaxWidth,
      { fontSize: NAME_FONT_SIZE, fontWeight: "bold" },
      { lineHeight: NAME_LINE_HEIGHT, maxLines: nameMaxLines }
    )
    return Math.max(1, wrapped.lines.length)
  }, [name, nameMaxWidth, nameMaxLines])

  const groupHeight = isComponentHeaderShown
    ? STEREOTYPE_LINE_HEIGHT +
      STEREOTYPE_NAME_GAP +
      nameLineCount * NAME_LINE_HEIGHT
    : nameLineCount * NAME_LINE_HEIGHT
  const groupTop = height / 2 - groupHeight / 2
  const stereotypeCenterY = groupTop + STEREOTYPE_LINE_HEIGHT / 2
  const nameFirstLineCenterY = isComponentHeaderShown
    ? groupTop +
      STEREOTYPE_LINE_HEIGHT +
      STEREOTYPE_NAME_GAP +
      NAME_LINE_HEIGHT / 2
    : groupTop + NAME_LINE_HEIGHT / 2

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
          fill={fillColor}
          stroke={strokeColor}
        />

        {/* right top book */}
        <g transform={`translate(${width - 32}, 8)`}>
          <path
            d="M 4.8 0 L 24 0 L 24 24 L 4.8 24 L 4.8 19.2 L 0 19.2 L 0 14.4 L 4.8 14.4 L 4.8 9.6 L 0 9.6 L 0 4.8 L 4.8 4.8 Z"
            strokeWidth={LAYOUT.ICON_LINE_WIDTH}
            strokeMiterlimit="10"
            stroke={strokeColor}
            fill="none"
          ></path>
          <path
            d="M 4.8 4.8 L 9.6 4.8 L 9.6 9.6 L 4.8 9.6 M 4.8 14.4 L 9.6 14.4 L 9.6 19.2 L 4.8 19.2"
            strokeWidth={LAYOUT.ICON_LINE_WIDTH}
            strokeMiterlimit="10"
            stroke={strokeColor}
            fill="none"
          ></path>
        </g>

        {/* «component» stereotype header — sits above the name block and
            moves upward as the name wraps so the whole {header, name}
            group stays vertically centered in the node. */}
        {isComponentHeaderShown && (
          <CustomText
            x={width / 2}
            y={stereotypeCenterY}
            textAnchor="middle"
            fontWeight="bold"
            dominantBaseline="middle"
            fill={textColor}
            fontSize="0.8em"
          >
            {"«component»"}
          </CustomText>
        )}

        {/* Wrapped name — the right padding leaves room for the icon, and
            the first-line center is positioned so the {header, name} group
            is centered as a unit (see `groupHeight` / `groupTop` above). */}
        <MultilineText
          text={name}
          x={width / 2}
          y={nameFirstLineCenterY}
          maxWidth={nameMaxWidth}
          fontSize={NAME_FONT_SIZE}
          fontWeight="bold"
          lineHeight={NAME_LINE_HEIGHT}
          fill={textColor}
          verticalAnchor="top"
          maxLines={nameMaxLines}
        />
      </g>

      {showAssessmentResults && (
        <AssessmentIcon x={width - 15} y={-15} score={nodeScore} />
      )}
    </svg>
  )
}
