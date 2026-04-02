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
  const previewScale = SIDEBAR_PREVIEW_SCALE ?? 1
  const scaledWidth = width * previewScale
  const scaledHeight = height * previewScale
  const labelHeight = LAYOUT.DEFAULT_ATTRIBUTE_HEIGHT
  const scaledLabelHeight = labelHeight * previewScale
  const svgHeight = height + labelHeight
  const scaledSvgHeight = scaledHeight + scaledLabelHeight

  const cx = width / 2
  const cy = height / 2
  const radius = Math.min(width, height) / 2

  const { strokeColor } = getCustomColorsFromData(data)
  const fillColor = data.fillColor || "var(--apollon-primary-contrast)"
  return (
    <svg
      width={scaledWidth}
      height={scaledSvgHeight}
      viewBox={`0 0 ${width} ${svgHeight}`}
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
        <CustomText
          x={cx}
          y={height + labelHeight / 2}
          textAnchor="middle"
          dominantBaseline="middle"
        >
          {name}
        </CustomText>
      )}
    </svg>
  )
}
