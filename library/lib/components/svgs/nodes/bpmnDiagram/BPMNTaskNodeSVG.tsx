import { CustomText, StyledRect } from "@/components"
import { useDiagramStore } from "@/store"
import { useShallow } from "zustand/shallow"
import AssessmentIcon from "../../AssessmentIcon"
import { SVGComponentProps } from "@/types/SVG"
import { BPMNTaskProps } from "@/types"
import { getCustomColorsFromData } from "@/utils/layoutUtils"

export type BPMNTaskNodeSVGProps = SVGComponentProps & {
  data: BPMNTaskProps
}

export const BPMNTaskNodeSVG: React.FC<BPMNTaskNodeSVGProps> = ({
  id,
  width,
  height,
  data,
  svgAttributes,
  SIDEBAR_PREVIEW_SCALE,
  showAssessmentResults = false,
}) => {
  const { name, taskType, marker } = data
  const assessments = useDiagramStore(useShallow((state) => state.assessments))
  const nodeScore = assessments[id]?.score
  const scaledWidth = width * (SIDEBAR_PREVIEW_SCALE ?? 1)
  const scaledHeight = height * (SIDEBAR_PREVIEW_SCALE ?? 1)

  const { fillColor, strokeColor, textColor } = getCustomColorsFromData(data)

  const icon = (() => {
    switch (taskType) {
      case "user":
        return (
          <g transform={`translate(10,10)`}>
            <circle cx={10} cy={4} r={4} fill="none" stroke={strokeColor} />
            <polyline
              points="4 16, 4 11, 16 11, 16 16"
              fill="none"
              stroke={strokeColor}
            />
          </g>
        )
      case "send":
        return (
          <g transform={`translate(10,10)`}>
            <polyline
              points="0.2 3, 19.8 3, 10 11, 0.2 3"
              fill="var(--apollon2-primary-contrast)"
              stroke={strokeColor}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <polyline
              points="0 5.5, 0 17, 20 17, 20 5.5, 10 13.5, 0 5.5"
              fill="var(--apollon2-primary-contrast)"
              stroke="var(--apollon2-primary-contrast)"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </g>
        )
      case "receive":
        return (
          <g transform={`translate(10,10)`}>
            <polyline
              points="0 3, 0 17, 20 17, 20 3, 10 11, 0 3, 20 3"
              fill="none"
              stroke="var(--apollon2-primary-contrast)"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </g>
        )
      case "manual":
        return (
          <g transform={`translate(10,10)`}>
            <path
              d="M5 1.5C5 2.5 5 8 5 8M5 1.5C5 0.499993 7 0.500007 7 1.5M5 1.5C5 1.5 5 4.00001 5 3.00001C5 2 3 1.93337 3 3.00001C3 4.06664 3 10 3 10C3 10 3 8.25001 3 7.25001C3 6.25 1 6.25 1 7.25001C1 8.25001 1 12 1 12L3 14V16H9V14L11 12V8.56252C11 8.56252 11 5 11 4C11 3 9 3 9 4C9 5 9 3.00001 9 3.00001M7 1.5C7 2.49999 7 8 7 8M7 1.5C7 1.5 7 4.00001 7 3.00001C7 2.00001 9 2.00001 9 3.00001M9 3.00001V8"
              fill="none"
              stroke={strokeColor}
              strokeLinejoin="round"
            />
          </g>
        )
      case "business-rule":
        return (
          <g transform={`translate(10,10)`}>
            <rect
              x={2}
              y={2}
              width={16}
              height={16}
              fill="none"
              stroke={strokeColor}
              strokeLinejoin="round"
            />
            <rect
              x={2}
              y={2}
              width={16}
              height={4}
              fill="currentColor"
              stroke={strokeColor}
              strokeLinejoin="round"
            />
            <polyline
              points="2 10, 18 10"
              stroke={strokeColor}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <polyline
              points="2 14, 18 14"
              stroke={strokeColor}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <polyline
              points="6 2, 6 18"
              stroke={strokeColor}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </g>
        )
      case "script":
        return (
          <g transform={`translate(10,10)`}>
            <rect
              x={2}
              y={2}
              width={16}
              height={16}
              fill="none"
              stroke={strokeColor}
              strokeLinejoin="round"
            />
            <polyline
              points="6 6, 12 6"
              fill="none"
              stroke={strokeColor}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <polyline
              points="6 10, 14 10"
              fill="none"
              stroke={strokeColor}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <polyline
              points="6 14, 10 14"
              fill="none"
              stroke={strokeColor}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </g>
        )
      default:
        return null
    }
  })()

  const markerEl = (() => {
    switch (marker) {
      case "parallel multi instance":
        return (
          <g transform={`translate(${width / 2 - 7}, ${height - 16})`}>
            <polyline
              points="3 3, 3 11"
              stroke={strokeColor}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <polyline
              points="7 3, 7 11"
              stroke={strokeColor}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <polyline
              points="11 3, 11 11"
              stroke={strokeColor}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </g>
        )
      case "sequential multi instance":
        return (
          <g transform={`translate(${width / 2 - 7}, ${height - 16})`}>
            <polyline
              points="3 3, 11 3"
              stroke={strokeColor}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <polyline
              points="3 7, 11 7"
              stroke={strokeColor}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <polyline
              points="3 11, 11 11"
              stroke={strokeColor}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </g>
        )
      case "loop":
        return (
          <g transform={`translate(${width / 2 - 7}, ${height - 16})`}>
            <path
              d={`M7,3 A 4 4 30 1 1 3.535 5`}
              fill="none"
              stroke={strokeColor}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d={`M9.5,1.5 L7,3 L8,6`}
              fill="none"
              stroke={strokeColor}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </g>
        )
      default:
        return null
    }
  })()

  return (
    <svg
      width={scaledWidth}
      height={scaledHeight}
      viewBox={`0 0 ${width} ${height}`}
      overflow="visible"
      {...svgAttributes}
    >
      <g>
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

        {icon}
        <CustomText
          x={width / 2}
          y={height / 2}
          textAnchor="middle"
          fontWeight="bold"
          fill={textColor}
        >
          {name}
        </CustomText>
        {markerEl}
      </g>

      {showAssessmentResults && (
        <AssessmentIcon x={width - 15} y={-15} score={nodeScore} />
      )}
    </svg>
  )
}
