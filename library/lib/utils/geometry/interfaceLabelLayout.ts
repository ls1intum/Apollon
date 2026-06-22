/**
 * Pure side-selection for the provided/required interface node label. The
 * interface is a small circle that connects only at its four directional
 * handles ("top"/"right"/"bottom"/"left"). The name sits centered below by
 * default (see InterfaceLabel), but must move off any side a connecting edge
 * attaches to — otherwise the label overlaps that edge. Pure and unit-testable
 * in the spirit of edgeLabelLayout.ts; no React, no DOM, no constants.
 */

/** A side an edge can attach to (the four directional interface handles). */
export type CardinalSide = "top" | "right" | "bottom" | "left"

/**
 * Where the label sits relative to the circle: one of the four sides, or — when
 * every side has a connecting edge — a diagonal quadrant (which no cardinal edge
 * passes through).
 */
export type InterfaceLabelSide =
  | CardinalSide
  | "top-left"
  | "top-right"
  | "bottom-left"
  | "bottom-right"

/** Minimal structural view of a React Flow edge (the store's `Edge[]` fits). */
interface InterfaceEdgeLike {
  source: string
  target: string
  sourceHandle?: string | null
  targetHandle?: string | null
}

// Interface nodes expose ONLY the four directional-middle handles, whose ids
// are exactly these strings (DefaultNodeWrapper FOUR_WAY_HANDLES_PRESET hides
// every other handle), so an exact match is correct and unambiguous.
const sideFromHandle = (
  handle: string | null | undefined
): CardinalSide | null => {
  switch (handle) {
    case "top":
    case "right":
    case "bottom":
    case "left":
      return handle
    default:
      return null
  }
}

/** The sides of `nodeId` that a connecting edge attaches to. */
export function getOccupiedInterfaceSides(
  edges: ReadonlyArray<InterfaceEdgeLike>,
  nodeId: string
): Set<CardinalSide> {
  const occupied = new Set<CardinalSide>()
  for (const edge of edges) {
    const isSource = edge.source === nodeId
    const isTarget = edge.target === nodeId
    if (!isSource && !isTarget) continue
    // Separate ifs (not else): a self-loop occupies BOTH its endpoint sides.
    if (isSource) {
      const side = sideFromHandle(edge.sourceHandle)
      if (side) occupied.add(side)
    }
    if (isTarget) {
      const side = sideFromHandle(edge.targetHandle)
      if (side) occupied.add(side)
    }
  }
  return occupied
}

/**
 * Picks where the label sits. Prefers a free cardinal side by priority — reads
 * naturally under a small circle (bottom, then top, then a horizontal side).
 * When the assessment badge occupies the top-right corner, "top" and "right"
 * are demoted last so a label can't graze the badge.
 *
 * If every cardinal side has a connecting edge, the label moves into a DIAGONAL
 * quadrant: each cardinal edge leaves along an axis, so a corner label sits in
 * the gap between two of them and crosses none. Prefer a corner away from the
 * top-right badge.
 */
export function pickInterfaceLabelSide(
  occupied: ReadonlySet<CardinalSide>,
  opts?: { badgeTopRight?: boolean }
): InterfaceLabelSide {
  const cardinals: CardinalSide[] = opts?.badgeTopRight
    ? ["bottom", "left", "top", "right"]
    : ["bottom", "top", "left", "right"]
  for (const side of cardinals) {
    if (!occupied.has(side)) return side
  }
  return opts?.badgeTopRight ? "bottom-left" : "bottom-right"
}

/** Convenience: the interface label side for `nodeId` given the current edges. */
export function computeInterfaceLabelSide(
  edges: ReadonlyArray<InterfaceEdgeLike>,
  nodeId: string,
  opts?: { badgeTopRight?: boolean }
): InterfaceLabelSide {
  return pickInterfaceLabelSide(getOccupiedInterfaceSides(edges, nodeId), opts)
}
