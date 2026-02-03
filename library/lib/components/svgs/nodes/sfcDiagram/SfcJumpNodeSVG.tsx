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
  const sideLength = 20
  const halfSideLength = sideLength / 2

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
        points={`0,0 0,${sideLength} ${sideLength},${halfSideLength} 0,0`}
        fill={fillColor}
        stroke={strokeColor}
        strokeWidth={LAYOUT.LINE_WIDTH}
      />
      <text
        fill={textColor}
        x={sideLength + 5}
        y={halfSideLength + 5}
        style={{ fontWeight: 600 }}
      >
        {name}
      </text>
    </svg>
  )
}
