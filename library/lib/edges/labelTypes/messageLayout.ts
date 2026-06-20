import { MessageData } from "../EdgeProps"
import { IPoint } from "../Connection"

/**
 * Geometry for communication-edge message labels, relative to the middle-segment
 * midpoint (position-independent, hence unit-testable on its own).
 *
 * Invariant: a group's SIDE is fixed by the segment orientation; flow direction
 * is encoded ONLY by the arrow rotation, never by the side. Gaps are constant by
 * construction — nothing measures text width.
 */

type ArrowDirection = "Up" | "Down" | "Left" | "Right"
export type LabelTextAnchor = "start" | "middle" | "end"

export const ARROW_SIZE = 16
export const ARROW_TEXT_GAP = 4
export const LINE_GAP = 8
export const STACK_SPACING = 22

export interface MessageGroupLayout {
  messages: MessageData[]
  arrowRotation: number
  textAnchor: LabelTextAnchor
  /** Top-left of the arrow icon for the first message, relative to the segment midpoint. */
  arrowOrigin: IPoint
  /** Text anchor point for the first message, relative to the segment midpoint. */
  textOrigin: IPoint
  /** Offset added per stacked message (multiplied by the message index). */
  stackStep: IPoint
}

export interface MessageLayout {
  forward: MessageGroupLayout
  backward: MessageGroupLayout
}

const calculateRotation = (direction: ArrowDirection): number => {
  switch (direction) {
    case "Right":
      return 0
    case "Left":
      return 180
    case "Down":
      return 90
    case "Up":
      return -90
  }
}

export const computeMessageLayout = (
  messages: MessageData[],
  sourcePosition: IPoint,
  targetPosition: IPoint,
  isHorizontalEdge: boolean
): MessageLayout => {
  const forwardMessages = messages.filter((msg) => msg.direction === "target")
  const backwardMessages = messages.filter((msg) => msg.direction === "source")

  let sourceArrowDirection: ArrowDirection
  let targetArrowDirection: ArrowDirection
  if (isHorizontalEdge) {
    const sourceIsLeft = sourcePosition.x < targetPosition.x
    sourceArrowDirection = sourceIsLeft ? "Left" : "Right"
    targetArrowDirection = sourceIsLeft ? "Right" : "Left"
  } else {
    const sourceIsAbove = sourcePosition.y < targetPosition.y
    sourceArrowDirection = sourceIsAbove ? "Up" : "Down"
    targetArrowDirection = sourceIsAbove ? "Down" : "Up"
  }

  const forwardRotation = calculateRotation(targetArrowDirection)
  const backwardRotation = calculateRotation(sourceArrowDirection)

  const half = ARROW_SIZE / 2
  const textInset = LINE_GAP + ARROW_SIZE + ARROW_TEXT_GAP

  if (isHorizontalEdge) {
    // Centred on the midpoint (text-anchor "middle") with the arrow stacked
    // between text and line, so a label never drifts sideways into a neighbour.
    const textGap = LINE_GAP + ARROW_SIZE + half + ARROW_TEXT_GAP
    return {
      forward: {
        messages: forwardMessages,
        arrowRotation: forwardRotation,
        textAnchor: "middle",
        arrowOrigin: { x: -half, y: -(LINE_GAP + ARROW_SIZE) },
        textOrigin: { x: 0, y: -textGap },
        stackStep: { x: 0, y: -STACK_SPACING },
      },
      backward: {
        messages: backwardMessages,
        arrowRotation: backwardRotation,
        textAnchor: "middle",
        arrowOrigin: { x: -half, y: LINE_GAP },
        textOrigin: { x: 0, y: textGap },
        stackStep: { x: 0, y: STACK_SPACING },
      },
    }
  }

  // Vertical: the arrow sits innermost (nearest the line) so the text can anchor
  // outward and grow away from the line without ever measuring its width.
  return {
    forward: {
      messages: forwardMessages,
      arrowRotation: forwardRotation,
      textAnchor: "start",
      arrowOrigin: { x: LINE_GAP, y: -half },
      textOrigin: { x: textInset, y: 0 },
      stackStep: { x: 0, y: STACK_SPACING },
    },
    backward: {
      messages: backwardMessages,
      arrowRotation: backwardRotation,
      textAnchor: "end",
      arrowOrigin: { x: -(LINE_GAP + ARROW_SIZE), y: -half },
      textOrigin: { x: -textInset, y: 0 },
      stackStep: { x: 0, y: STACK_SPACING },
    },
  }
}
