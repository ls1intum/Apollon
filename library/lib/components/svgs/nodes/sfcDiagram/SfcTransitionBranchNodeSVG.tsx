import { CustomText } from "@/components"
import { LAYOUT } from "@/constants"
import { SfcTransitionBranchNodeProps } from "@/types"
import { SVGComponentProps } from "@/types/SVG"
import { getCustomColorsFromData } from "@/utils/layoutUtils"

interface Props extends SVGComponentProps {
  data: SfcTransitionBranchNodeProps
}

export const SfcTransitionBranchNodeSVG: React.FC<Props> = ({
  width,
  height,
  data,
  svgAttributes,
  SIDEBAR_PREVIEW_SCALE,
}) => {
  const { name, showHint } = data
  const scaledWidth = width * (SIDEBAR_PREVIEW_SCALE ?? 1)
  const scaledHeight = height * (SIDEBAR_PREVIEW_SCALE ?? 1)

  const cx = width / 2
  const cy = height / 2
  const radius = Math.min(width, height) / 2

  const { strokeColor } = getCustomColorsFromData(data)
  const fillColor = data.fillColor || "var(--apollon2-primary-contrast)"
  return (
    <svg
      width={scaledWidth}
      height={scaledHeight}
      viewBox={`0 0 ${width} ${height}`}
      overflow="visible"
      {...svgAttributes}
    >
      <circle
        cx={cx}
        cy={cy}
        r={radius}
        fill={fillColor}
        stroke={strokeColor}
        strokeWidth={LAYOUT.LINE_WIDTH}
      />
      {showHint && (
        <CustomText x={cx} y={height - 2} textAnchor="middle">
          {name}
        </CustomText>
      )}
    </svg>
  )
}
