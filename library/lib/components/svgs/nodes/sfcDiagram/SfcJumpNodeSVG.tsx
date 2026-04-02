import { LAYOUT } from "@/constants"
import { DefaultNodeProps } from "@/types"
import { SVGComponentProps } from "@/types/SVG"
import { getCustomColorsFromData } from "@/utils/layoutUtils"

interface Props extends SVGComponentProps {
  data: DefaultNodeProps
}

export const SfcJumpNodeSVG: React.FC<Props> = ({
  width,
  height,
  data,
  svgAttributes,
  SIDEBAR_PREVIEW_SCALE,
}) => {
  const { name } = data
  const scaledWidth = width * (SIDEBAR_PREVIEW_SCALE ?? 1)
  const scaledHeight = height * (SIDEBAR_PREVIEW_SCALE ?? 1)
  const diamondSize = 20
  const padding = 8
  const diamondX = padding
  const diamondY = (height - diamondSize) / 2
  const diamondHalfSize = diamondSize / 2

  const { fillColor, strokeColor, textColor } = getCustomColorsFromData(data)

  return (
    <svg
      width={scaledWidth}
      height={scaledHeight}
      viewBox={`0 0 ${width} ${height}`}
      overflow="visible"
      {...svgAttributes}
    >
      <rect
        x={0}
        y={0}
        width={width}
        height={height}
        fill="none"
        stroke="none"
      />
      <polyline
        points={`${diamondX},${diamondY} ${diamondX},${diamondY + diamondSize} ${diamondX + diamondSize},${diamondY + diamondHalfSize} ${diamondX},${diamondY}`}
        fill={fillColor}
        stroke={strokeColor}
        strokeWidth={LAYOUT.LINE_WIDTH}
        strokeLinejoin="miter"
      />
      <text
        fill={textColor}
        x={diamondX + diamondSize + padding}
        y={diamondY + diamondHalfSize}
        style={{ fontWeight: 600 }}
        dominantBaseline="middle"
      >
        {name}
      </text>
    </svg>
  )
}
