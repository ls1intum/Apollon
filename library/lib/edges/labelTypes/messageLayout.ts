import { MessageData } from "../EdgeProps"
import { IPoint } from "../Connection"

/**
 * Geometry for communication-diagram message labels.
 *
 * A communication edge carries bidirectional messages along its middle
 * segment. Forward messages (direction "target", i.e. source → target) sit on
 * one side of the segment, backward messages (direction "source") on the other:
 *
 *   - horizontal middle segment → forward ABOVE, backward BELOW
 *   - vertical   middle segment → forward RIGHT, backward LEFT
 *
 * Which side a group lands on is fixed; the message's flow direction is encoded
 * purely by the arrow rotation, never by the side. Nothing here measures the
 * text width — gaps are constant by construction:
 *
 *   - horizontal labels are CENTRED on the segment midpoint (text-anchor
 *     "middle", matching EdgeMiddleLabels) with the arrow stacked between the
 *     text and the line, so a label never drifts sideways into a neighbour.
 *   - vertical labels are anchored to their inner edge and grown outward via the
 *     text-anchor ("start" on the right, "end" on the left), so the gap to the
 *     line is constant regardless of how long the text is.
 */

type ArrowDirection = "Up" | "Down" | "Left" | "Right"
export type LabelTextAnchor = "start" | "middle" | "end"

/** Rendered size of the direction arrow icon (square). */
export const ARROW_SIZE = 16
/** Gap between the arrow icon and the label text (vertical edges). */
export const ARROW_TEXT_GAP = 4
/** Gap kept clear between the nearest label element and the edge line. */
export const LINE_GAP = 8
/** Distance between stacked messages of the same group. */
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

/**
 * Pure layout for a communication edge's message labels. Everything is expressed
 * relative to the middle-segment midpoint, so the result is independent of the
 * absolute path position and trivially unit-testable.
 */
export const computeMessageLayout = (
  messages: MessageData[],
  sourcePosition: IPoint,
  targetPosition: IPoint,
  isHorizontalEdge: boolean
): MessageLayout => {
  const forwardMessages = messages.filter((msg) => msg.direction === "target")
  const backwardMessages = messages.filter((msg) => msg.direction === "source")

  // Arrow directions follow the geometry of the two endpoints. The arrow is the
  // only thing that encodes flow direction; the label side stays fixed.
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
    // Forward above the line, backward below. Both are centred on the midpoint's
    // x (text-anchor "middle") with the arrow stacked between the text and the
    // line, so the label stays put no matter how long the text is.
    const textGap = LINE_GAP + ARROW_SIZE + half + 4
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

  // Vertical middle segment: forward on the right, backward on the left. The
  // arrow sits innermost (nearest the line) so the text can be anchored away
  // from the line and grow outward without ever measuring its width.
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
