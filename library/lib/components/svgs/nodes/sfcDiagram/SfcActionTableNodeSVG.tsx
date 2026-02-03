import { LAYOUT } from "@/constants"
import { SVGComponentProps } from "@/types/SVG"
import { CustomText, StyledRect } from "@/components"
import { SfcActionTableProps } from "@/types"
import { getCustomColorsFromData } from "@/utils"

interface Props extends SVGComponentProps {
  data: SfcActionTableProps
}

export const SfcActionTableNodeSVG: React.FC<Props> = ({
  width,
  height,
  svgAttributes,
  SIDEBAR_PREVIEW_SCALE,
  data,
}) => {
  const { actionRows } = data
  const scaledWidth = width * (SIDEBAR_PREVIEW_SCALE ?? 1)
  const scaledHeight = height * (SIDEBAR_PREVIEW_SCALE ?? 1)
  const rowHeight = 30
  const numberOfLines = Math.floor(height / rowHeight) - 1
  const horizontalLines = Array.from(
    { length: numberOfLines },
    (_, i) => (i + 1) * rowHeight
  )

  const { strokeColor } = getCustomColorsFromData(data)

  return (
    <svg
      width={scaledWidth}
      height={scaledHeight}
      viewBox={`0 0 ${width} ${height}`}
      overflow="visible"
      {...svgAttributes}
    >
      <StyledRect
        x={0}
        y={0}
        width={width}
        height={height}
        fill="none"
        stroke={strokeColor}
      />
      {/* Grid lines */}
      {horizontalLines.map((y) => (
        <line
          key={y}
          x1={0}
          y1={y}
          x2={width}
          y2={y}
          stroke={strokeColor}
          strokeWidth={LAYOUT.LINE_WIDTH}
        />
      ))}

      {/* Render action rows */}
      {actionRows.map((row, index) => {
        const y = index * rowHeight // Start from top, no header
        if (y + rowHeight > height) return null // Don't render if it would overflow

        const {
          fillColor,

          textColor,
        } = getCustomColorsFromData(row)
        const rowStrokeColor = row.strokeColor ?? strokeColor

        return (
          <g key={row.id}>
            <rect
              x={0}
              y={y}
              width={width}
              height={rowHeight}
              fill={fillColor}
              stroke={rowStrokeColor}
            />

            <CustomText
              x={15}
              y={y + 15}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize="14"
              fontWeight="normal"
              fill={textColor}
            >
              {row.identifier}
            </CustomText>
            <CustomText
              x={40}
              y={y + 15}
              textAnchor="start"
              dominantBaseline="middle"
              fontSize="14"
              fontWeight="normal"
              fill={textColor}
            >
              {row.name}
            </CustomText>
          </g>
        )
      })}
      <line
        x1={30}
        y1={0}
        x2={30}
        y2={height}
        stroke={strokeColor}
        strokeWidth={LAYOUT.LINE_WIDTH}
      />
    </svg>
  )
}
