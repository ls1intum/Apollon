import { MessageData } from "../EdgeProps"
import { IPoint } from "../Connection"
import { collapseCollinearPoints } from "@/utils/geometry/bendHandles"

/**
 * Geometry for communication-edge message labels, relative to the middle-segment
 * midpoint (position-independent, hence unit-testable on its own).
 *
 * Invariant: a group's SIDE is fixed by the segment orientation; flow direction
 * is encoded ONLY by the arrow rotation, never by the side. Gaps are constant by
 * construction — nothing measures text width.
 */

export interface MessageHostSegment {
  /** Rounded midpoint of the chosen arm (flow space). */
  point: IPoint
  /** Orientation of the chosen arm. */
  isHorizontal: boolean
  /** The arm's endpoints in source->target order (for arrow direction). */
  start: IPoint
  end: IPoint
}

/**
 * The arm of a (possibly stepped) communication edge that should HOST the
 * message stack. The naive mid-segment can land on a tiny jog between two long
 * arms — classifying a dominantly-vertical edge as "horizontal" so the labels
 * centre on the jog and straddle BOTH neighbouring arms. Instead we host on the
 * LONGEST arm (tie-broken toward the edge's middle), so the stack sits beside a
 * long straight run: it never crosses the line and, in vertical mode, all
 * same-direction messages share a leading edge. Pure geometry — identical in the
 * editor and in headless export.
 */
export const getMessageHostSegment = (
  renderPoints: IPoint[],
  fallbackSource: IPoint,
  fallbackTarget: IPoint
): MessageHostSegment => {
  const points = collapseCollinearPoints(renderPoints)
  if (points.length < 2) {
    return {
      point: {
        x: Math.round((fallbackSource.x + fallbackTarget.x) / 2),
        y: Math.round((fallbackSource.y + fallbackTarget.y) / 2),
      },
      isHorizontal:
        Math.abs(fallbackTarget.x - fallbackSource.x) >=
        Math.abs(fallbackTarget.y - fallbackSource.y),
      start: fallbackSource,
      end: fallbackTarget,
    }
  }

  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const point of points) {
    minX = Math.min(minX, point.x)
    maxX = Math.max(maxX, point.x)
    minY = Math.min(minY, point.y)
    maxY = Math.max(maxY, point.y)
  }
  const centerX = (minX + maxX) / 2
  const centerY = (minY + maxY) / 2

  let bestIndex = 0
  let bestLength = -1
  let bestDistance = Infinity
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i]
    const b = points[i + 1]
    const length = Math.abs(b.x - a.x) + Math.abs(b.y - a.y)
    const distance =
      Math.abs((a.x + b.x) / 2 - centerX) + Math.abs((a.y + b.y) / 2 - centerY)
    // Prefer the longest arm; on a near-tie prefer the one nearest the middle.
    if (
      length > bestLength + 1e-6 ||
      (Math.abs(length - bestLength) <= 1e-6 && distance < bestDistance)
    ) {
      bestIndex = i
      bestLength = length
      bestDistance = distance
    }
  }

  const a = points[bestIndex]
  const b = points[bestIndex + 1]
  return {
    point: {
      x: Math.round((a.x + b.x) / 2),
      y: Math.round((a.y + b.y) / 2),
    },
    isHorizontal: Math.abs(b.x - a.x) >= Math.abs(b.y - a.y),
    start: a,
    end: b,
  }
}

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
