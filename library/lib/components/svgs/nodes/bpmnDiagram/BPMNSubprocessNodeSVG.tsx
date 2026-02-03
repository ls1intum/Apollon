import { CustomText, StyledRect } from "@/components"
import { LAYOUT } from "@/constants"
import { useDiagramStore } from "@/store"
import { SVGComponentProps } from "@/types/SVG"
import { useShallow } from "zustand/shallow"
import AssessmentIcon from "../../AssessmentIcon"
import { getCustomColorsFromData } from "@/utils/layoutUtils"
import { BPMNSubprocessProps } from "@/types/nodes/NodeProps"

interface BPMNSubprocessNodeSVGProps extends SVGComponentProps {
  data: BPMNSubprocessProps
  variant?: "subprocess" | "transaction" | "call"
}
export const BPMNSubprocessNodeSVG: React.FC<BPMNSubprocessNodeSVGProps> = ({
  width,
  height,
  data,
  svgAttributes,
  SIDEBAR_PREVIEW_SCALE,
  id,
  showAssessmentResults = false,
  variant = "subprocess",
}) => {
  const { name } = data
  const assessments = useDiagramStore(useShallow((state) => state.assessments))
  const nodeScore = assessments[id]?.score
  const scaledWidth = width * (SIDEBAR_PREVIEW_SCALE ?? 1)
  const scaledHeight = height * (SIDEBAR_PREVIEW_SCALE ?? 1)
  const isTransaction = variant === "transaction"
  const isCall = variant === "call"
  const isSubprocess = !isTransaction && !isCall

  const { fillColor, strokeColor, textColor } = getCustomColorsFromData(data)
  return (
    <svg
      width={scaledWidth}
      height={scaledHeight}
      viewBox={`0 0 ${width} ${height}`}
      overflow="visible"
      {...svgAttributes}
    >
      {/* Transaction: double border */}
      {isTransaction && (
        <>
          <StyledRect
            x={0}
            y={0}
            width={width}
            height={height}
            rx={10}
            ry={10}
            fill={fillColor}
            stroke={strokeColor}
          />
          <StyledRect
            x={3}
            y={3}
            width={width - 6}
            height={height - 6}
            rx={7}
            ry={7}
            fill="none"
            stroke={strokeColor}
          />
        </>
      )}
      {/* Call Activity: single thick border */}
      {isCall && (
        <StyledRect
          x={0}
          y={0}
          width={width}
          height={height}
          strokeWidth={LAYOUT.LINE_WIDTH * 3}
          rx={10}
          ry={10}
          fill={fillColor}
          stroke={strokeColor}
        />
      )}
      {/* Subprocess: single border + plus box */}
      {isSubprocess && (
        <>
          <StyledRect
            x={0}
            y={0}
            width={width}
            height={height}
            rx={10}
            ry={10}
            fill={fillColor}
            stroke={strokeColor}
          />
          {/* Plus box marker */}
          <rect
            x={width / 2 - 7}
            y={height - 14}
            width={14}
            height={14}
            fill="none"
            stroke={strokeColor}
          />
          <line
            x1={width / 2 - 4}
            y1={height - 7}
            x2={width / 2 + 4}
            y2={height - 7}
            stroke={strokeColor}
          />
          <line
            x1={width / 2}
            y1={height - 11}
            x2={width / 2}
            y2={height - 3}
            stroke={strokeColor}
          />
        </>
      )}
      <CustomText
        x={width / 2}
        y={height / 2}
        textAnchor="middle"
        fontWeight="bold"
        fill={textColor}
      >
        {name}
      </CustomText>

      {showAssessmentResults && (
        <AssessmentIcon x={width - 15} y={-15} score={nodeScore} />
      )}
    </svg>
  )
}
