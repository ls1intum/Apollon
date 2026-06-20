import { useMessagePositioning } from "../../hooks"
import { IPoint } from "../Connection"
import { MessageData } from "../EdgeProps"
import { ARROW_SIZE, MessageGroupLayout } from "./messageLayout"

interface EdgeMultipleLabelsProps {
  messages?: MessageData[]
  pathMiddlePosition: IPoint
  showRelationshipLabels: boolean
  isReconnectingRef?: React.MutableRefObject<boolean>
  sourcePosition: IPoint
  targetPosition: IPoint
  isHorizontalEdge?: boolean
  textColor: string
}

export const EdgeMultipleLabels = ({
  messages,
  pathMiddlePosition,
  showRelationshipLabels,
  isReconnectingRef,
  sourcePosition,
  targetPosition,
  isHorizontalEdge,
  textColor,
}: EdgeMultipleLabelsProps) => {
  const displayMessages: MessageData[] = messages || []

  const { forward, backward, isPositioned } = useMessagePositioning(
    displayMessages,
    sourcePosition,
    targetPosition,
    !!isHorizontalEdge
  )

  if (
    displayMessages.length === 0 ||
    !showRelationshipLabels ||
    !isPositioned ||
    isReconnectingRef?.current
  )
    return null

  const renderGroup = (group: MessageGroupLayout, keyPrefix: string) =>
    group.messages.map((message, index) => {
      const textX =
        pathMiddlePosition.x + group.textOrigin.x + index * group.stackStep.x
      const textY =
        pathMiddlePosition.y + group.textOrigin.y + index * group.stackStep.y

      return (
        <g key={`${keyPrefix}-${index}`}>
          {/* One direction arrow per group, rendered with the first message. */}
          {index === 0 && (
            <g
              transform={`translate(${pathMiddlePosition.x + group.arrowOrigin.x}, ${
                pathMiddlePosition.y + group.arrowOrigin.y
              }) rotate(${group.arrowRotation}, ${ARROW_SIZE / 2}, ${ARROW_SIZE / 2})`}
            >
              {/* Scale the 24x24 icon paths down to the 16x16 arrow box. */}
              <g transform={`scale(${ARROW_SIZE / 24})`}>
                <path
                  d="M2 12h20"
                  stroke={textColor}
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                />
                <path
                  d="m17 5 5 7-5 7"
                  stroke={textColor}
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                />
              </g>
            </g>
          )}

          <text
            x={textX}
            y={textY}
            textAnchor={group.textAnchor}
            dominantBaseline="middle"
            style={{
              fontSize: "14px",
              fontWeight: 400,
              fill: textColor,
              userSelect: "none",
              pointerEvents: "none",
            }}
          >
            {message.text || ""}
          </text>
        </g>
      )
    })

  return (
    <g className="edge-labels">
      {renderGroup(forward, "forward")}
      {renderGroup(backward, "backward")}
    </g>
  )
}
