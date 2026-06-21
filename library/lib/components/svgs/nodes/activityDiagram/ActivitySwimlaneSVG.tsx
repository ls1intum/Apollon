import { MultilineText, StyledRect } from "@/components"
import { LAYOUT } from "@/constants"
import { useDiagramStore } from "@/store"
import { SVGComponentProps } from "@/types/SVG"
import { useShallow } from "zustand/shallow"
import AssessmentIcon from "../../AssessmentIcon"
import { ActivitySwimlaneProps } from "@/types"
import { getCustomColorsFromData, getLaneOffsets } from "@/utils"

/** Thickness of the band that holds the lane name labels. */
export const SWIMLANE_HEADER_SIZE = 30

interface ActivitySwimlaneSVGProps extends SVGComponentProps {
  data: ActivitySwimlaneProps
}

export const ActivitySwimlaneSVG: React.FC<ActivitySwimlaneSVGProps> = ({
  width,
  height,
  data,
  svgAttributes,
  SIDEBAR_PREVIEW_SCALE,
  id,
  showAssessmentResults = false,
}) => {
  const lanes = data.lanes ?? []
  const isVertical = (data.orientation ?? "vertical") === "vertical"
  const assessments = useDiagramStore(useShallow((state) => state.assessments))
  const nodeScore = assessments[id]?.score
  const scaledWidth = width * (SIDEBAR_PREVIEW_SCALE ?? 1)
  const scaledHeight = height * (SIDEBAR_PREVIEW_SCALE ?? 1)

  const { fillColor, strokeColor, textColor } = getCustomColorsFromData(data)

  // Lanes divide the primary axis by their (possibly resized) sizes; the header
  // band runs along the cross-axis start (top for vertical columns, left for
  // horizontal rows).
  const primaryExtent = isVertical ? width : height
  const laneOffsets = getLaneOffsets(lanes, primaryExtent)

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
        fill={fillColor}
        stroke={strokeColor}
      />

      {/* Header separator between the label band and the action area */}
      {isVertical ? (
        <line
          x1={0}
          y1={SWIMLANE_HEADER_SIZE}
          x2={width}
          y2={SWIMLANE_HEADER_SIZE}
          stroke={strokeColor}
          strokeWidth={LAYOUT.LINE_WIDTH}
        />
      ) : (
        <line
          x1={SWIMLANE_HEADER_SIZE}
          y1={0}
          x2={SWIMLANE_HEADER_SIZE}
          y2={height}
          stroke={strokeColor}
          strokeWidth={LAYOUT.LINE_WIDTH}
        />
      )}

      {lanes.map((lane, index) => {
        const { start, extent } = laneOffsets[index]
        const center = start + extent / 2

        return (
          <g key={lane.id}>
            {index > 0 &&
              (isVertical ? (
                <line
                  x1={start}
                  y1={0}
                  x2={start}
                  y2={height}
                  stroke={strokeColor}
                  strokeWidth={LAYOUT.LINE_WIDTH}
                />
              ) : (
                <line
                  x1={0}
                  y1={start}
                  x2={width}
                  y2={start}
                  stroke={strokeColor}
                  strokeWidth={LAYOUT.LINE_WIDTH}
                />
              ))}

            {isVertical ? (
              <MultilineText
                text={lane.name}
                x={center}
                y={SWIMLANE_HEADER_SIZE / 2}
                maxWidth={extent - 8}
                maxLines={1}
                fontSize={LAYOUT.NAME_FONT_SIZE}
                fill={textColor}
              />
            ) : (
              <MultilineText
                text={lane.name}
                x={SWIMLANE_HEADER_SIZE / 2}
                y={center}
                maxWidth={extent - 8}
                maxLines={1}
                fontSize={LAYOUT.NAME_FONT_SIZE}
                fill={textColor}
                transform={`rotate(-90, ${SWIMLANE_HEADER_SIZE / 2}, ${center})`}
              />
            )}
          </g>
        )
      })}

      {showAssessmentResults && (
        <AssessmentIcon x={width - 15} y={-15} score={nodeScore} />
      )}
    </svg>
  )
}
