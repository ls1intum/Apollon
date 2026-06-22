import { IPoint } from "../Connection"
import { MessageData } from "../EdgeProps"
import {
  ARROW_SIZE,
  computeMessageLayout,
  MessageGroupLayout,
} from "./messageLayout"

interface EdgeMultipleLabelsProps {
  messages?: MessageData[]
  pathMiddlePosition: IPoint
  showRelationshipLabels: boolean
  isReconnecting?: boolean
  sourcePosition: IPoint
  targetPosition: IPoint
  isHorizontalEdge: boolean
  textColor: string
}

export const EdgeMultipleLabels = ({
  messages,
  pathMiddlePosition,
  showRelationshipLabels,
  isReconnecting,
  sourcePosition,
  targetPosition,
  isHorizontalEdge,
  textColor,
}: EdgeMultipleLabelsProps) => {
  const displayMessages = messages ?? []

  if (displayMessages.length === 0 || !showRelationshipLabels || isReconnecting)
    return null

  const { forward, backward } = computeMessageLayout(
    displayMessages,
    sourcePosition,
    targetPosition,
    isHorizontalEdge
  )

  const renderGroup = (group: MessageGroupLayout, keyPrefix: string) =>
    group.messages.map((message, index) => (
      <g key={`${keyPrefix}-${message.id}`}>
        {/* One direction arrow per group, drawn with the first message. */}
        {index === 0 && (
          <g
            transform={`translate(${pathMiddlePosition.x + group.arrowOrigin.x}, ${
              pathMiddlePosition.y + group.arrowOrigin.y
            }) rotate(${group.arrowRotation}, ${ARROW_SIZE / 2}, ${ARROW_SIZE / 2})`}
          >
            {/* Lucide "move-right" glyph (24×24, stroked) scaled to the arrow box. */}
            <g
              transform={`scale(${ARROW_SIZE / 24})`}
              stroke={textColor}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            >
              <path d="M2 12h20" />
              <path d="m17 5 5 7-5 7" />
            </g>
          </g>
        )}

        <text
          x={
            pathMiddlePosition.x +
            group.textOrigin.x +
            index * group.stackStep.x
          }
          y={
            pathMiddlePosition.y +
            group.textOrigin.y +
            index * group.stackStep.y
          }
          textAnchor={group.textAnchor}
          dominantBaseline="middle"
          style={{
            fontSize: "14px",
            fill: textColor,
            userSelect: "none",
            pointerEvents: "none",
          }}
        >
          {message.text}
        </text>
      </g>
    ))

  return (
    <g className="edge-labels">
      {renderGroup(forward, "forward")}
      {renderGroup(backward, "backward")}
    </g>
  )
}
