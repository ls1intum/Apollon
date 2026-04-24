import { MultilineText } from "@/components"
import { LAYOUT } from "@/constants"
import { DefaultNodeProps } from "@/types"
import { getCustomColorsFromData } from "@/utils"
import { maxLinesForHeight } from "@/utils/svgTextLayout"
import { SVGAttributes } from "react"

export type ColorDescriptionSVGProps = {
  width: number
  height: number
  data: DefaultNodeProps
  SIDEBAR_PREVIEW_SCALE?: number
  svgAttributes?: SVGAttributes<SVGElement>
}

export function ColorDescriptionSVG({
  width,
  height,
  data,
  svgAttributes,
  SIDEBAR_PREVIEW_SCALE,
}: ColorDescriptionSVGProps) {
  const strokeWidth = LAYOUT.LINE_WIDTH

  const scaledWidth = width * (SIDEBAR_PREVIEW_SCALE ?? 1)
  const scaledHeight = height * (SIDEBAR_PREVIEW_SCALE ?? 1)
  const { name } = data

  const { strokeColor, fillColor, textColor } = getCustomColorsFromData(data)

  return (
    <svg
      width={scaledWidth}
      height={scaledHeight}
      viewBox={`0 0 ${width} ${height}`}
      overflow="visible"
      {...svgAttributes}
    >
      <g>
        {/* Main Path */}
        <path
          d={`M 0 0 L ${width - 15} 0 L ${width - 15} 15 L ${width} 15 L ${width} ${height} L 0 ${height} L 0 0 Z`}
          strokeWidth={strokeWidth}
          strokeMiterlimit="10"
          stroke={strokeColor}
          fill={fillColor}
        />
        {/* Small Path for Top-Right Corner */}
        <path
          d={`M ${width - 15} 0 L ${width - 15} 15 L ${width} 15 L ${width - 15} 0 Z`}
          strokeWidth={strokeWidth}
          strokeMiterlimit="10"
          stroke={strokeColor}
          fill={fillColor}
        />
        {/* Description Text — wrap inside the shape, leaving room for the
            notched top-right corner. Vertical lines are capped at what
            fits inside the node height. */}
        <MultilineText
          text={name}
          x={width / 2}
          y={height / 2}
          maxWidth={width - 24}
          fontSize={LAYOUT.NAME_FONT_SIZE}
          fontWeight="600"
          fill={textColor}
          maxLines={maxLinesForHeight(height - 16, LAYOUT.NAME_LINE_HEIGHT)}
        />
      </g>
    </svg>
  )
}
