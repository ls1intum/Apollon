import { Position, type Rect } from "@xyflow/system"
import { CANVAS } from "@/utils/geometry/routingConstants"
import type { IPoint } from "@/edges/Connection"

/**
 * The shared vocabulary for talking about a node rectangle's four sides: which way
 * a side faces, how long it is, and which side faces a given point.
 *
 * Anchor selection, port assignment and the solver all reason about sides, and each
 * had grown its own copy of these. Two copies of `facingSide` had even drifted apart
 * — one dividing by the half-extents, the other cross-multiplying — so they could
 * disagree at a boundary and pick different sides for the same geometry, which
 * quietly breaks the promise that every peer derives identical anchors.
 */

/** The outward unit normal of a side. */
export const OUTWARD_NORMAL: Record<Position, IPoint> = {
  [Position.Top]: { x: 0, y: -1 },
  [Position.Bottom]: { x: 0, y: 1 },
  [Position.Left]: { x: -1, y: 0 },
  [Position.Right]: { x: 1, y: 0 },
}

export const OPPOSITE_SIDE: Record<Position, Position> = {
  [Position.Top]: Position.Bottom,
  [Position.Bottom]: Position.Top,
  [Position.Left]: Position.Right,
  [Position.Right]: Position.Left,
}

/** Total order over sides, so a geometry-blind tie-break is still the same on every
 * peer. */
export const SIDE_ORDER: Record<Position, number> = {
  [Position.Top]: 0,
  [Position.Right]: 1,
  [Position.Bottom]: 2,
  [Position.Left]: 3,
}

export const ALL_SIDES: readonly Position[] = [
  Position.Top,
  Position.Right,
  Position.Bottom,
  Position.Left,
]

/** Left/Right run along the node's height; Top/Bottom along its width. */
export const isVerticalSide = (side: Position): boolean =>
  side === Position.Left || side === Position.Right

export const centerOf = (r: Rect): IPoint => ({
  x: r.x + r.width / 2,
  y: r.y + r.height / 2,
})

/** The length of a side: the extent a port can slide along. */
export const sideAxisLength = (side: Position, rect: Rect): number =>
  isVerticalSide(side) ? rect.height : rect.width

/**
 * The side of `rect` that faces `toward` — the one a bend-free run would leave from.
 * Whichever axis the point is more strongly displaced along, measured relative to the
 * node's half-extent so a wide-short node is not biased toward its long sides.
 *
 * Cross-multiplied rather than divided: on integer-ish coordinates the products are
 * exact where the quotients are not, so the comparison cannot land differently on
 * different engines.
 */
export const facingSide = (rect: Rect, toward: IPoint): Position => {
  const c = centerOf(rect)
  const dx = toward.x - c.x
  const dy = toward.y - c.y
  const halfW = rect.width / 2 || 1
  const halfH = rect.height / 2 || 1
  return Math.abs(dx) * halfH >= Math.abs(dy) * halfW
    ? dx >= 0
      ? Position.Right
      : Position.Left
    : dy >= 0
      ? Position.Bottom
      : Position.Top
}

/** How much two intervals overlap (0 when they do not). */
export const rangeOverlapLen = (
  aLo: number,
  aHi: number,
  bLo: number,
  bHi: number
): number => Math.max(0, Math.min(aHi, bHi) - Math.max(aLo, bLo))

/**
 * How far a port must stay from the corners of a side. A port in the corner makes the
 * segment leaving it graze the node it just left, so both ends of a straight run need
 * this much room. Shrinks on a small node, which has no room to give.
 */
export const cornerMargin = (axisA: number, axisB: number): number =>
  Math.min(2 * CANVAS.SNAP_TO_GRID_PX, Math.min(axisA, axisB) * 0.3)

/**
 * Whether two nodes can be joined by a STRAIGHT run on the given axis: their extents
 * must overlap by enough to seat a port on each, clear of all four corners.
 *
 * One rule, one home. Port assignment used a flat 15px while anchor selection required
 * room for both margins, so between 15px and 20px of overlap the solver would place
 * ports for a straight run that anchor selection then never offered as a candidate —
 * the edge came out stepped. Same failure mode as the two `facingSide` copies, one
 * level up: a duplicate that reads differently rather than looking identical.
 */
export const canRunStraight = (
  alongVerticalSides: boolean,
  a: Rect,
  b: Rect
): boolean => {
  const overlap = alongVerticalSides
    ? rangeOverlapLen(a.y, a.y + a.height, b.y, b.y + b.height)
    : rangeOverlapLen(a.x, a.x + a.width, b.x, b.x + b.width)
  const axisA = alongVerticalSides ? a.height : a.width
  const axisB = alongVerticalSides ? b.height : b.width
  return overlap >= 2 * cornerMargin(axisA, axisB)
}
