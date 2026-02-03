import { CustomText } from "@/components"
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
      <circle cx={10} cy={10} r={10} fill={fillColor} stroke={strokeColor} />
      {showHint && (
        <CustomText x={0} y={30}>
          {name}
        </CustomText>
      )}
    </svg>
  )
}
