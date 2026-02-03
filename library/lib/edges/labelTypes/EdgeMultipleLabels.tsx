import { ZINDEX } from "@/constants"
import { IPoint } from "../Connection"
import { EdgeLabelRenderer } from "@xyflow/react"
import { MessageData } from "../EdgeProps"
import { useMessagePositioning } from "../../hooks"
import { Stack } from "@mui/material"

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
      return { y: index * spacing, x: 0 }
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

      return (
        <div key={`${keyPrefix}-${index}`}>
          {/* Message container with arrow and text */}
          <Stack
            direction="row"
            alignItems="center"
            spacing={1}
            style={{
              position: "absolute",
              transform: `translate(${pathMiddlePosition.x + labelBoxPosition.x + offset.x}px, ${pathMiddlePosition.y + labelBoxPosition.y + offset.y}px) translate(-50%, -50%)`,
              zIndex: ZINDEX.LABEL,
              pointerEvents: "none",
            }}
            className="nodrag nopan"
          >
            {/* Arrow (only for first message in group) */}
            {index === 0 && (
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{
                  color: textColor,
                  transform: `rotate(${arrowRotation}deg)`,
                  transformOrigin: "center",
                  flexShrink: 0,
                }}
              >
                <path d="M2 12h20" />
                <path d="m17 5 5 7-5 7" />
              </svg>
            )}

            {/* Label */}
            <div
              style={{
                fontSize: "14px",
                fontWeight: 400,
                color: textColor,
                whiteSpace: "nowrap",
              }}
            >
              {message.text}
            </div>
          </Stack>
        </div>
      )
    })
  }

  return (
    <EdgeLabelRenderer>
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
    </EdgeLabelRenderer>
  )
}
