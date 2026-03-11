import { CustomText } from "@/components"
import { LAYOUT } from "@/constants"
import { useDiagramStore } from "@/store"
import { useShallow } from "zustand/shallow"
import AssessmentIcon from "../../AssessmentIcon"
import { SVGComponentProps } from "@/types/SVG"
import { DefaultNodeProps } from "@/types"

export type PackageSVGProps = SVGComponentProps & {
  data: DefaultNodeProps
}

const leftTopBoxHeight = 10
const padding = 5

export const PackageSVG: React.FC<PackageSVGProps> = ({
  id,
  width,
  height,
  data,
  svgAttributes,
  SIDEBAR_PREVIEW_SCALE,
  showAssessmentResults = false,
}) => {
  const { name } = data
  const assessments = useDiagramStore(useShallow((state) => state.assessments))
  const nodeScore = assessments[id]?.score

  const scaledWidth = width * (SIDEBAR_PREVIEW_SCALE ?? 1)
  const scaledHeight = height * (SIDEBAR_PREVIEW_SCALE ?? 1)

  const strokeColor = data.strokeColor || "var(--apollon2-primary-contrast)"
  const fillColor = data.fillColor || "var(--apollon2-background)"
  const textColor = data.textColor || "var(--apollon2-primary-contrast)"

  return (
    <svg
      width={scaledWidth}
      height={scaledHeight}
      viewBox={`0 0 ${width} ${height}`}
      overflow="visible"
      {...svgAttributes}
    >
      <g>
        {/* Left-Top Box */}
        <rect
          x={0}
          y={0}
          width={40}
          height={leftTopBoxHeight}
          strokeWidth={LAYOUT.LINE_WIDTH}
          stroke={strokeColor}
          fill={fillColor}
        />

        {/* Main Box */}
        <rect
          x={0}
          y={leftTopBoxHeight}
          width={width}
          height={height - leftTopBoxHeight}
          strokeWidth={LAYOUT.LINE_WIDTH}
          stroke={strokeColor}
          fill={fillColor}
        />

        {/* Name Text */}
        <CustomText
          x={width / 2}
          y={leftTopBoxHeight + padding}
          textAnchor="middle"
          fontWeight="600"
          dominantBaseline="hanging"
          fill={textColor}
        >
          {name}
        </CustomText>
      </g>

      {showAssessmentResults && (
        <AssessmentIcon x={width - 15} y={-5} score={nodeScore} />
      )}
    </svg>
  )
}
