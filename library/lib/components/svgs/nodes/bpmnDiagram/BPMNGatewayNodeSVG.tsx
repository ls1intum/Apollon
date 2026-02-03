import { LAYOUT } from "@/constants"
import { useDiagramStore } from "@/store"
import { SVGComponentProps } from "@/types/SVG"
import { useShallow } from "zustand/shallow"
import AssessmentIcon from "../../AssessmentIcon"
import { BPMNGatewayProps } from "@/types"
import { CustomText } from "@/components"
import { getCustomColorsFromData } from "@/utils"

type BPMNGatewayNodeSVGProps = SVGComponentProps & {
  data: BPMNGatewayProps
}

export const BPMNGatewayNodeSVG: React.FC<BPMNGatewayNodeSVGProps> = ({
  width,
  height,
  svgAttributes,
  SIDEBAR_PREVIEW_SCALE,
  id,
  data,
  showAssessmentResults = false,
}) => {
  const { name, gatewayType = "exclusive" } = data
  const assessments = useDiagramStore(useShallow((state) => state.assessments))
  const nodeScore = assessments[id]?.score
  const scaledWidth = width * (SIDEBAR_PREVIEW_SCALE ?? 1)
  const scaledHeight = height * (SIDEBAR_PREVIEW_SCALE ?? 1)

  const cx = width / 2
  const cy = height / 2
  const w = Math.min(width, height)
  const half = w / 2

  const points = [
    `${cx},${cy - half}`,
    `${cx + half},${cy}`,
    `${cx},${cy + half}`,
    `${cx - half},${cy}`,
  ].join(" ")

  const { fillColor, strokeColor, textColor } = getCustomColorsFromData(data)

  return (
    <svg
      width={scaledWidth}
      height={scaledHeight}
      viewBox={`0 0 ${width} ${height}`}
      overflow="visible"
      {...svgAttributes}
    >
      <polygon
        points={points}
        strokeWidth={LAYOUT.LINE_WIDTH}
        stroke={strokeColor}
        fill={fillColor}
      />
      {gatewayType === "exclusive" && (
        <g>
          <line
            x1={13}
            y1={13}
            x2={width - 13}
            y2={height - 13}
            stroke={strokeColor}
          />
          <line
            x1={13}
            y1={height - 13}
            x2={width - 13}
            y2={13}
            stroke={strokeColor}
          />
        </g>
      )}
      {gatewayType === "parallel" && (
        <g>
          <line
            x1={width / 2}
            y1={10}
            x2={width / 2}
            y2={height - 10}
            stroke={strokeColor}
          />
          <line
            x1={10}
            y1={height / 2}
            x2={width - 10}
            y2={height / 2}
            stroke={strokeColor}
          />
        </g>
      )}
      {gatewayType === "inclusive" && (
        <circle
          cx={width / 2}
          cy={height / 2}
          r={Math.min(width, height) / 2 - 12}
          fill="none"
          stroke={strokeColor}
        />
      )}
      {gatewayType === "event-based" && (
        <g>
          <circle
            cx={width / 2}
            cy={height / 2}
            r={Math.min(width, height) / 2 - 9}
            fill="none"
            stroke={strokeColor}
          />
          <circle
            cx={width / 2}
            cy={height / 2}
            r={Math.min(width, height) / 2 - 12}
            fill="none"
            stroke={strokeColor}
          />
          {/* small pentagon */}
          <path
            d={`M${width / 2} ${height / 2 - 4} L${width / 2 + 3.5} ${height / 2 - 1} L${width / 2 + 2} ${
              height / 2 + 3.5
            } L${width / 2 - 2} ${height / 2 + 3.5} L${width / 2 - 3.5} ${height / 2 - 1} Z`}
            fill="none"
            stroke={strokeColor}
          />
        </g>
      )}
      {gatewayType === "complex" && (
        <g>
          {/* X */}
          <line
            x1={13}
            y1={13}
            x2={width - 13}
            y2={height - 13}
            stroke={strokeColor}
          />
          <line
            x1={13}
            y1={height - 13}
            x2={width - 13}
            y2={13}
            stroke={strokeColor}
          />
          {/* + */}
          <line
            x1={width / 2}
            y1={10}
            x2={width / 2}
            y2={height - 10}
            stroke={strokeColor}
          />
          <line
            x1={10}
            y1={height / 2}
            x2={width - 10}
            y2={height / 2}
            stroke={strokeColor}
          />
        </g>
      )}
      {name && (
        <CustomText
          x={width / 2}
          y={height + 10}
          textAnchor="middle"
          fontSize={14}
          dominantBaseline="hanging"
          fill={textColor}
        >
          {name}
        </CustomText>
      )}

      {showAssessmentResults && (
        <AssessmentIcon x={width - 15} y={-15} score={nodeScore} />
      )}
    </svg>
  )
}
