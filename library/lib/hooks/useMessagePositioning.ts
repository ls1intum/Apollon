import { useMemo, useState, useEffect } from "react"
import { MessageData } from "../edges/EdgeProps"
import { IPoint } from "@/edges"
import {
  computeMessageLayout,
  MessageLayout,
} from "../edges/labelTypes/messageLayout"

type MessagePositioningResult = MessageLayout & {
  /**
   * The middle-segment midpoint is measured from the rendered DOM path one tick
   * after mount (see useStepPathEdge). Until that measurement lands the labels
   * would flash at a stale position, so we gate the first render on it.
   */
  isPositioned: boolean
}

export const useMessagePositioning = (
  displayMessages: MessageData[],
  sourcePosition: IPoint,
  targetPosition: IPoint,
  isHorizontalEdge: boolean
): MessagePositioningResult => {
  const [isPositioned, setIsPositioned] = useState(false)

  const layout = useMemo(
    () =>
      computeMessageLayout(
        displayMessages,
        sourcePosition,
        targetPosition,
        isHorizontalEdge
      ),
    [displayMessages, sourcePosition, targetPosition, isHorizontalEdge]
  )

  useEffect(() => {
    if (displayMessages.length === 0) {
      setIsPositioned(false)
      return
    }
    const timeout = setTimeout(() => setIsPositioned(true), 0)
    return () => clearTimeout(timeout)
  }, [displayMessages, sourcePosition, targetPosition])

  return { ...layout, isPositioned }
}
