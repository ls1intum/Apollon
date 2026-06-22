import { InterfaceLabel } from "../InterfaceLabel"
import { LAYOUT } from "@/constants"
import { useDiagramStore } from "@/store"
import { useShallow } from "zustand/shallow"
import AssessmentIcon from "../../AssessmentIcon"
import { SVGComponentProps } from "@/types/SVG"
import { DefaultNodeProps } from "@/types"
import { getCustomColorsFromData } from "@/utils/layoutUtils"
import type { InterfaceLabelSide } from "@/utils/geometry/interfaceLabelLayout"

interface Props extends SVGComponentProps {
  data: DefaultNodeProps
  labelSide?: InterfaceLabelSide
}

export const DeploymentInterfaceSVG: React.FC<Props> = ({
  id,
  width,
  height,
  svgAttributes,
  SIDEBAR_PREVIEW_SCALE,
  showAssessmentResults = false,
  data,
  labelSide,
}) => {
  const { name } = data
  const assessments = useDiagramStore(useShallow((state) => state.assessments))
  const nodeScore = assessments[id]?.score
  const scaledWidth = width * (SIDEBAR_PREVIEW_SCALE ?? 1)
  const scaledHeight = height * (SIDEBAR_PREVIEW_SCALE ?? 1)
  const { fillColor, strokeColor, textColor } = getCustomColorsFromData(data)

  return (
    <svg
      width={scaledWidth}
      height={scaledHeight}
      viewBox={`0 0 ${width} ${height}`}
      overflow="visible"
      {...svgAttributes}
    >
      <g>
        <circle
          cx={width / 2}
          cy={height / 2}
          r={width / 2}
          strokeWidth={LAYOUT.LINE_WIDTH_EDGE}
          stroke={strokeColor}
          fill={fillColor}
        />

        <InterfaceLabel
          name={name}
          width={width}
          height={height}
          fill={textColor}
          side={labelSide}
        />
      </g>

      {showAssessmentResults && (
        <AssessmentIcon x={width - 15} y={-15} score={nodeScore} />
      )}
    </svg>
  )
}
