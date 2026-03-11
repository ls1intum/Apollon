import { useMessagePositioning } from "../../hooks"
import { IPoint } from "../Connection"
import { MessageData } from "../EdgeProps"

interface EdgeMultipleLabelsProps {
  messages?: MessageData[]
  pathMiddlePosition: IPoint
  showRelationshipLabels: boolean
  isReconnectingRef?: React.MutableRefObject<boolean>
  sourcePosition: IPoint
  targetPosition: IPoint
  edgePoints?: IPoint[]
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
  edgePoints,
  isHorizontalEdge,
  textColor,
}: EdgeMultipleLabelsProps) => {
  const displayMessages: MessageData[] = messages || []

  const {
    forwardMessages,
    backwardMessages,
    forwardArrowRotation,
    backwardArrowRotation,
    forwardLabelBoxPosition,
    backwardLabelBoxPosition,
    isPositioned,
  } = useMessagePositioning(
    displayMessages,
    sourcePosition,
    targetPosition,
    pathMiddlePosition,
    edgePoints,
    isHorizontalEdge
  )

  if (
    !displayMessages ||
    displayMessages.length === 0 ||
    !showRelationshipLabels ||
    !isPositioned
  )
    return null

  if (isReconnectingRef?.current) return null

  const getMessageOffset = (index: number, isForward: boolean) => {
    const spacing = 25

    if (isHorizontalEdge) {
      if (isForward) {
        return { y: -index * spacing, x: 0 }
      } else {
        return { y: index * spacing, x: 0 }
      }
    } else {
      // For vertical edges, separate forward and backward messages vertically
      if (isForward) {
        return { y: -index * spacing, x: 0 }
      } else {
        return { y: index * spacing, x: 0 }
      }
    }
  }

  const renderMessages = (
    messageList: MessageData[],
    labelBoxPosition: { x: number; y: number },
    arrowRotation: number,
    keyPrefix: string,
    isForward: boolean
  ) => {
    return messageList.map((message, index) => {
      const offset = getMessageOffset(index, isForward)

      const x = pathMiddlePosition.x + labelBoxPosition.x + offset.x
      const y = pathMiddlePosition.y + labelBoxPosition.y + offset.y

      // Arrow dimensions — match the original 16x16 visual size
      // (old code used <svg width="16" height="16" viewBox="0 0 24 24">)
      const arrowWidth = 16
      const arrowHeight = 16
      const arrowTextSpacing = 4

      // Defensive: handle missing text property
      const messageText = message.text || ""
      const estimatedTextWidth = messageText.length * 8
      const totalWidth = arrowWidth + arrowTextSpacing + estimatedTextWidth

      // Center the entire label (arrow + text) around the x position
      const labelStartX = x - totalWidth / 2

      return (
        <g key={`${keyPrefix}-${index}`}>
          {/* Arrow (only for first message in group) */}
          {index === 0 && (
            <g
              transform={`translate(${labelStartX}, ${y - arrowHeight / 2}) rotate(${arrowRotation}, ${arrowWidth / 2}, ${arrowHeight / 2})`}
            >
              {/* Scale 24x24 icon paths down to fit 16x16 box */}
              <g transform={`scale(${16 / 24})`}>
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

          {/* Label Text */}
          <text
            x={labelStartX + arrowWidth + arrowTextSpacing}
            y={y}
            textAnchor="start"
            dominantBaseline="middle"
            style={{
              fontSize: "14px",
              fontWeight: 400,
              fill: textColor,
              userSelect: "none",
              pointerEvents: "none",
            }}
          >
            {messageText}
          </text>
        </g>
      )
    })
  }

  return (
    <g className="edge-labels">
      {/* Forward Messages (pointing to target) */}
      {renderMessages(
        forwardMessages,
        forwardLabelBoxPosition,
        forwardArrowRotation,
        "forward",
        true // isForward = true
      )}

      {/* Backward Messages (pointing to source) */}
      {renderMessages(
        backwardMessages,
        backwardLabelBoxPosition,
        backwardArrowRotation,
        "backward",
        false // isForward = false
      )}
    </g>
  )
}
