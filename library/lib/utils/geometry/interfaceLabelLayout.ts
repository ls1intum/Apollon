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

/** Minimal structural view of a React Flow edge (the store's `Edge[]` fits). `id` is
 * only needed to look up the edge's routed geometry; without it the stored-handle
 * fallback applies. */
interface InterfaceEdgeLike {
  id?: string
  source: string
  target: string
  sourceHandle?: string | null
  targetHandle?: string | null
}

interface Pt {
  x: number
  y: number
}
interface RectLike {
  x: number
  y: number
  width: number
  height: number
}

/** The side of `rect` a point on its border sits on — whichever axis it is displaced
 * along more, relative to the half-extents (so a wide-short node is not biased). This is
 * how an edge's ACTUAL attachment side is read back from its routed endpoint, since the
 * router derives sides itself and the stored handle can be stale. */
const sideOfPoint = (p: Pt, rect: RectLike): CardinalSide => {
  const halfW = rect.width / 2 || 1
  const halfH = rect.height / 2 || 1
  const dx = (p.x - (rect.x + halfW)) / halfW
  const dy = (p.y - (rect.y + halfH)) / halfH
  return Math.abs(dx) >= Math.abs(dy)
    ? dx >= 0
      ? "right"
      : "left"
    : dy >= 0
      ? "bottom"
      : "top"
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

/**
 * The sides of `nodeId` a connecting edge attaches to. The attachment side is read from
 * the edge's ROUTED endpoint when its geometry is available (the router derives sides
 * itself — the memoryless anchor selector routinely picks a side different from the
 * stored handle), and falls back to the stored handle for an edge not yet routed. Pass a
 * rect + geometry to use the derived sides; omit them to use handles alone.
 */
export function getOccupiedInterfaceSides(
  edges: ReadonlyArray<InterfaceEdgeLike>,
  nodeId: string,
  geometry?: {
    rect: RectLike
    routeById: Readonly<Record<string, ReadonlyArray<Pt>>>
  }
): Set<CardinalSide> {
  const occupied = new Set<CardinalSide>()
  const derivedSide = (
    edge: InterfaceEdgeLike,
    end: "source" | "target"
  ): CardinalSide | null => {
    if (!geometry || edge.id === undefined) return null
    const route = geometry.routeById[edge.id]
    if (!route || route.length < 2) return null
    const p = end === "source" ? route[0] : route[route.length - 1]
    return sideOfPoint(p, geometry.rect)
  }
  for (const edge of edges) {
    const isSource = edge.source === nodeId
    const isTarget = edge.target === nodeId
    if (!isSource && !isTarget) continue
    // Separate ifs (not else): a self-loop occupies BOTH its endpoint sides.
    if (isSource) {
      const side =
        derivedSide(edge, "source") ?? sideFromHandle(edge.sourceHandle)
      if (side) occupied.add(side)
    }
    if (isTarget) {
      const side =
        derivedSide(edge, "target") ?? sideFromHandle(edge.targetHandle)
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

/** Convenience: the interface label side for `nodeId` given the current edges — and,
 * when supplied, the node rect + routed geometry so the OCCUPIED sides are read from
 * where the edges actually attach, not their (possibly stale) stored handles. */
export function computeInterfaceLabelSide(
  edges: ReadonlyArray<InterfaceEdgeLike>,
  nodeId: string,
  opts?: {
    badgeTopRight?: boolean
    geometry?: {
      rect: RectLike
      routeById: Readonly<Record<string, ReadonlyArray<Pt>>>
    }
  }
): InterfaceLabelSide {
  return pickInterfaceLabelSide(
    getOccupiedInterfaceSides(edges, nodeId, opts?.geometry),
    opts
  )
}
