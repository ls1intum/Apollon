import { Position, type Rect } from "@xyflow/react"
import { CANVAS, EDGES } from "@/constants"
import type { IPoint } from "@/edges/Connection"

/**
 * Geometric PORT ASSIGNMENT — the deterministic pre-routing stage that decides,
 * for every free edge-end landing on a node side, its ORDER along that side and
 * its POSITION on it. Forks, bundles, nesting and even spacing EMERGE from one
 * rule — the angular (rotation) order of the partner directions around the node —
 * rather than from a stack of imperative passes (fans, lane offsets, slots, a
 * dir-mirror, a fork redistributor).
 *
 * This is the Hegemann–Wolff / libavoid / ELK / yFiles consensus specialised to
 * our exact setting (free-floating rectangles, no layering): partner direction
 * decides SIDE and ORDER; positions are then spread in a CENTRED band, never
 * aimed at the partner (aiming is what jams anchors into corners). See
 * `.context/edge-cost-model/` for the cited evidence and design.
 *
 * Every decision is a pure function of the current geometry, integer-exact
 * (cross-products, no `atan2`/`hypot`/float on a decision path) and totally
 * ordered — so two Yjs peers and a reload all assign the identical ports.
 */

const GRID = CANVAS.SNAP_TO_GRID_PX

/** Preferred gap between adjacent ports on a side, in px. Kept small so a shared
 * side reads as a tight centred band, not anchors flung to the corners (ELK's
 * `portPort` default is 10, yFiles' border-gap ratio 0.5, Hegemann–Wolff 18). */
export const PORT_PITCH_PX = 3 * GRID

/** The widest gap an even spread will open between neighbouring ports. Ports are
 * distributed evenly across the side (ELK's DISTRIBUTED alignment) so the stretches
 * between and around them read as deliberate, but a very wide side would otherwise
 * fling two ports far apart — which buys nothing and pushes each toward a corner,
 * where the route can pick up an extra bend. Caps the spread at a legible spacing. */
const MAX_PORT_GAP_PX = 8 * GRID

/** Minimum gap kept between the outermost port and a corner — a corner anchor
 * makes the first segment graze the node it just left. */
const CORNER_CLEARANCE_PX = 2 * GRID

const isVerticalSide = (side: Position): boolean =>
  side === Position.Left || side === Position.Right

const centerOf = (r: Rect): IPoint => ({
  x: r.x + r.width / 2,
  y: r.y + r.height / 2,
})

const clamp = (v: number, lo: number, hi: number): number =>
  Math.max(lo, Math.min(hi, v))

/**
 * The side of `rect` that faces `toward` — the one a bend-free run would leave
 * from. Whichever axis the partner is more strongly displaced along (relative to
 * the node's half-extent) wins. Integer-exact: `|dx|·h` vs `|dy|·w`, no division.
 */
export const facingSide = (rect: Rect, toward: IPoint): Position => {
  const c = centerOf(rect)
  const dx = toward.x - c.x
  const dy = toward.y - c.y
  const halfW = rect.width / 2 || 1
  const halfH = rect.height / 2 || 1
  // |dx|/halfW >= |dy|/halfH  ⇔  |dx|·halfH >= |dy|·halfW
  return Math.abs(dx) * halfH >= Math.abs(dy) * halfW
    ? dx >= 0
      ? Position.Right
      : Position.Left
    : dy >= 0
      ? Position.Bottom
      : Position.Top
}

const OUTWARD_NORMAL: Record<Position, IPoint> = {
  [Position.Top]: { x: 0, y: -1 },
  [Position.Bottom]: { x: 0, y: 1 },
  [Position.Left]: { x: -1, y: 0 },
  [Position.Right]: { x: 1, y: 0 },
}

const SIDE_ORDER: Record<Position, number> = {
  [Position.Top]: 0,
  [Position.Right]: 1,
  [Position.Bottom]: 2,
  [Position.Left]: 3,
}

const rangeOverlapLen = (
  aLo: number,
  aHi: number,
  bLo: number,
  bHi: number
): number => Math.max(0, Math.min(aHi, bHi) - Math.max(aLo, bLo))

/** How much perpendicular-axis overlap a STRAIGHT shot needs to be real rather than a
 * corner-jammed step. A few px of overlap technically lets a straight line touch both
 * nodes, but the port lands within a corner and the router draws a 2-corner Z (the
 * "step") — which must cost MORE than switching one end to a clean 1-corner L. So a
 * straight only counts as 0 bends once the overlap clears this; below it, a diagonal L
 * wins. (d55's 20px overlap stays straight; d60's 5px becomes an L.) */
const MIN_STRAIGHT_OVERLAP_PX = 3 * GRID

const overlapsEnoughForStraight = (
  vertical: boolean,
  a: Rect,
  b: Rect
): boolean =>
  (vertical
    ? rangeOverlapLen(a.y, a.y + a.height, b.y, b.y + b.height)
    : rangeOverlapLen(a.x, a.x + a.width, b.x, b.x + b.width)) >=
  MIN_STRAIGHT_OVERLAP_PX

/**
 * The number of CORNERS an edge would take to leave `side` of `rect` toward
 * `partner` — the obstacle-free bend count from Wybrow et al. (GD'09), reduced to
 * the two rectangles here since ports slide within a side:
 *   - the side faces AWAY from the partner (its outward normal · direction ≤ 0) → 3
 *     (a U-turn); such a side is never the minimum,
 *   - the side faces the partner AND the two opposing sides' extents OVERLAP on the
 *     perpendicular axis → 0 (a straight shot: the port slides to align),
 *   - the side faces the partner but the extents do NOT overlap → 1 (a clean L).
 * Integer-exact (a dot product of integer vectors), so peers agree.
 */
const bendsForSide = (side: Position, rect: Rect, partner: Rect): number => {
  const c = centerOf(rect)
  const p = centerOf(partner)
  const n = OUTWARD_NORMAL[side]
  const along = n.x * (p.x - c.x) + n.y * (p.y - c.y)
  if (along <= 0) return 3
  return overlapsEnoughForStraight(isVerticalSide(side), rect, partner) ? 0 : 1
}

const SIDES = [Position.Top, Position.Right, Position.Bottom, Position.Left]

/**
 * The number of CORNERS an edge takes when it leaves side `sU` of U and enters side
 * `sV` of V, with ports free to SLIDE within each side (so an opposing pair that can
 * align is 0, not 2). This is the JOINT bend count — the per-end `bendsForSide` is
 * only a lower bound, because two "1-corner" ends can combine into a 2-corner Z (both
 * on the axis facing the partner) instead of a 1-corner L (one facing, one
 * perpendicular). From Wybrow et al. (GD'09):
 *   - a side that points AWAY from the partner adds a U-turn → 3–4,
 *   - both sides face each other and OPPOSE: 0 if the perpendicular extents overlap
 *     (a straight shot), else 2 (an offset Z),
 *   - both face each other and are PERPENDICULAR: 1 (a clean L),
 *   - same side: 2.
 * Integer-exact (integer dot products), deterministic.
 */
const combinedBends = (
  sU: Position,
  sV: Position,
  U: Rect,
  V: Rect
): number => {
  const cU = centerOf(U)
  const cV = centerOf(V)
  const dx = cV.x - cU.x
  const dy = cV.y - cU.y
  const nU = OUTWARD_NORMAL[sU]
  const nV = OUTWARD_NORMAL[sV]
  const alongU = nU.x * dx + nU.y * dy // sU points toward V?
  const alongV = -(nV.x * dx + nV.y * dy) // sV points toward U?
  if (alongU <= 0 && alongV <= 0) return 4
  if (alongU <= 0 || alongV <= 0) return 3
  if (nU.x === -nV.x && nU.y === -nV.y)
    // Opposing sides: a straight shot (0) only when the overlap is enough to seat the
    // port clear of the corners; a tight overlap draws a 2-corner Z (a "step"), so it
    // ties the same as an offset pair and loses to a 1-corner perpendicular L.
    return overlapsEnoughForStraight(isVerticalSide(sU), U, V) ? 0 : 2
  if (nU.x === nV.x && nU.y === nV.y) return 2
  return 1 // perpendicular
}

const lexLess = (a: readonly number[], b: readonly number[]): boolean => {
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return a[i] < b[i]
  return false
}

/** The midpoint of a side of `rect`. */
const sideMidpoint = (side: Position, rect: Rect): IPoint => {
  switch (side) {
    case Position.Top:
      return { x: rect.x + rect.width / 2, y: rect.y }
    case Position.Bottom:
      return { x: rect.x + rect.width / 2, y: rect.y + rect.height }
    case Position.Left:
      return { x: rect.x, y: rect.y + rect.height / 2 }
    default:
      return { x: rect.x + rect.width, y: rect.y + rect.height / 2 }
  }
}

/**
 * The APPROXIMATE orthogonal polyline a side pair would produce, drawn between the two
 * side midpoints. Used only to compare candidates against each other for CROSSINGS at
 * side-assignment time — positions are not chosen yet, so this is deliberately the
 * shape, not the final route.
 */
const approxRoute = (
  sU: Position,
  sV: Position,
  U: Rect,
  V: Rect
): IPoint[] => {
  const a = sideMidpoint(sU, U)
  const b = sideMidpoint(sV, V)
  const uVert = isVerticalSide(sU) // left/right ⇒ leaves horizontally
  const vVert = isVerticalSide(sV)
  if (uVert !== vVert)
    // Perpendicular: one corner, on the axis each end leaves along.
    return uVert ? [a, { x: b.x, y: a.y }, b] : [a, { x: a.x, y: b.y }, b]
  if (uVert) {
    // Both horizontal-leaving: straight when the ys match, else a Z through the middle.
    if (a.y === b.y) return [a, b]
    const midX = (a.x + b.x) / 2
    return [a, { x: midX, y: a.y }, { x: midX, y: b.y }, b]
  }
  if (a.x === b.x) return [a, b]
  const midY = (a.y + b.y) / 2
  return [a, { x: a.x, y: midY }, { x: b.x, y: midY }, b]
}

/** Crossings between two orthogonal polylines — an exact integer H×V test (no float
 * on the decision path). Endpoints touching do not count. */
const countCrossings = (p: readonly IPoint[], q: readonly IPoint[]): number => {
  let n = 0
  for (let i = 0; i < p.length - 1; i++) {
    const a1 = p[i]
    const a2 = p[i + 1]
    const aH = a1.y === a2.y
    for (let j = 0; j < q.length - 1; j++) {
      const b1 = q[j]
      const b2 = q[j + 1]
      const bH = b1.y === b2.y
      if (aH === bH) continue // parallel: an overlap is not a crossing
      const h = aH ? { a: a1, b: a2 } : { a: b1, b: b2 }
      const v = aH ? { a: b1, b: b2 } : { a: a1, b: a2 }
      const hy = h.a.y
      const vx = v.a.x
      const between = (m: number, lo: number, hi: number) =>
        m > Math.min(lo, hi) && m < Math.max(lo, hi)
      if (between(vx, h.a.x, h.b.x) && between(hy, v.a.y, v.b.y)) n++
    }
  }
  return n
}

/** One edge whose free ends need a side. `sourceBand`/`targetBand` mark the ends
 * that are FREE and on a MULTI-EDGE node (the ones this stage assigns); a custom,
 * lone, or single-edge-node end is left false and keeps the cost path. */
export type SideEdge = {
  edgeId: string
  sourceNodeId: string
  targetNodeId: string
  sourceRect: Rect
  targetRect: Rect
  sourceBand: boolean
  targetBand: boolean
}

/**
 * JOINTLY assign each band end its node SIDE to minimise corners across the whole
 * diagram. The per-edge minimum is a corner count over the (source-side, target-side)
 * PAIR (`combinedBends`), not two independent per-end choices — that independence is
 * what turned a diagonal fork arm into a 2-corner Z (both ends on the axis facing the
 * partner) instead of a 1-corner L.
 *
 * Straight-eligible edges (some side pair costs 0) are assigned FIRST so they claim
 * their opposing sides; the remaining L-edges then avoid those sides. Within equal
 * corner counts the tie-break prefers the LESS crowded sides (so a fork spreads and an
 * L avoids a side a straight already took), then the sides most aligned with the raw
 * centre-to-centre direction, then a fixed side order. Pure, integer, deterministic —
 * peers assign the identical sides.
 */
export const assignSides = (
  edges: readonly SideEdge[],
  /** Every node's rect, keyed by id, so a candidate side pair whose route would run
   * THROUGH a third node can be rejected. Side assignment counts corners on the
   * obstacle-FREE ideal, so without this it happily picks a "1-corner" pair that the
   * router then has to detour into three corners around whatever is in the way. A node
   * crossing outranks a bend (the cited order is node-overlap ≻ crossing ≻ bend). */
  nodeRects: ReadonlyMap<string, Rect> = new Map()
): Map<string, Position> => {
  // Occupancy is a set of DISTINCT PARTNER NODES already placed on each `(node, side)`.
  // Counting distinct partners — excluding an edge's own partner — is what separates a
  // FORK (different partners, which should spread across sides) from a same-partner
  // BUNDLE (which should stay together and nest by position, not be split across sides).
  const occ = new Map<string, Set<string>>()
  const occAdd = (node: string, side: Position, partner: string): void => {
    const key = `${node}|${side}`
    const set = occ.get(key)
    if (set) set.add(partner)
    else occ.set(key, new Set([partner]))
  }
  const occOthers = (node: string, side: Position, exclude: string): number => {
    const set = occ.get(`${node}|${side}`)
    if (!set) return 0
    return set.has(exclude) ? set.size - 1 : set.size
  }

  const hasStraight = (e: SideEdge): boolean =>
    SIDES.some((sU) =>
      SIDES.some(
        (sV) => combinedBends(sU, sV, e.sourceRect, e.targetRect) === 0
      )
    )
  // Straight edges first (they lock the aligned opposing sides), then by id.
  const ordered = [...edges].sort((a, b) => {
    const sa = hasStraight(a) ? 0 : 1
    const sb = hasStraight(b) ? 0 : 1
    if (sa !== sb) return sa - sb
    return a.edgeId < b.edgeId ? -1 : a.edgeId > b.edgeId ? 1 : 0
  })

  // Approximate shapes of the edges already assigned, so a later edge can prefer a side
  // pair that does NOT cross them. Edges that SHARE a node are included: they converge
  // at that node (which costs nothing — the strict `between` test ignores touching
  // endpoints) but can still genuinely cross out in the open, which is d59's defect.
  const placed: IPoint[][] = []
  const crossingsAgainstPlaced = (route: IPoint[]): number => {
    let n = 0
    for (const p of placed) n += countCrossings(route, p)
    return n
  }

  /** How many nodes — other than the edge's own two — the approximate route passes
   * through. Axis-aligned segment vs rect, with a small inset so merely grazing a
   * border does not count. */
  const nodesCrossed = (e: SideEdge, route: readonly IPoint[]): number => {
    let n = 0
    for (const [id, r] of nodeRects) {
      if (id === e.sourceNodeId || id === e.targetNodeId) continue
      const lo = { x: r.x + 1, y: r.y + 1 }
      const hi = { x: r.x + r.width - 1, y: r.y + r.height - 1 }
      for (let i = 0; i < route.length - 1; i++) {
        const a = route[i]
        const b = route[i + 1]
        const segLoX = Math.min(a.x, b.x)
        const segHiX = Math.max(a.x, b.x)
        const segLoY = Math.min(a.y, b.y)
        const segHiY = Math.max(a.y, b.y)
        if (segLoX < hi.x && segHiX > lo.x && segLoY < hi.y && segHiY > lo.y) {
          n++
          break
        }
      }
    }
    return n
  }

  // NOTE: the fan's members are NOT forced onto a common side. Measured across the
  // corpus, buying a shared side cost 7 extra corners and introduced a crossing to gain
  // one unified arrowhead — so merging is OPPORTUNISTIC: arrowheads collapse when the
  // geometry already brings the fan to one side, and the layout is not distorted to
  // manufacture that.

  const result = new Map<string, Position>()
  for (const e of ordered) {
    const { sourceRect: U, targetRect: V } = e
    const dx = centerOf(V).x - centerOf(U).x
    const dy = centerOf(V).y - centerOf(U).y
    const aimU = (s: Position): number =>
      Math.abs(OUTWARD_NORMAL[s].x * dx + OUTWARD_NORMAL[s].y * dy)
    const aimV = (s: Position): number =>
      Math.abs(OUTWARD_NORMAL[s].x * -dx + OUTWARD_NORMAL[s].y * -dy)

    if (e.sourceBand && e.targetBand) {
      let best: { sU: Position; sV: Position } | null = null
      let bestKey: number[] | null = null
      for (const sU of SIDES)
        for (const sV of SIDES) {
          const route = approxRoute(sU, sV, U, V)
          const key = [
            // A route driven through another node is the worst thing side assignment
            // can choose — far worse than a bend — so it leads the key.
            nodesCrossed(e, route),
            combinedBends(sU, sV, U, V),
            // Raw-direction alignment DOMINATES: keep an edge on the side its partner
            // actually lies toward (so two same-direction edges bundle). Occupancy only
            // breaks a genuine aim TIE — e.g. a diagonal L reachable two ways equally,
            // where the pair avoiding a side a DIFFERENT-partner edge already took wins.
            -(aimU(sU) + aimV(sV)),
            // Among equally-aimed pairs, prefer one that does NOT cross an edge already
            // assigned. This outranks occupancy: an emptier side is worth less than an
            // untangled picture (d59 chose the free side and crossed its neighbour).
            crossingsAgainstPlaced(route),
            occOthers(e.sourceNodeId, sU, e.targetNodeId) +
              occOthers(e.targetNodeId, sV, e.sourceNodeId),
            // When an L can bend two ways at equal aim + occupancy (a diagonal pair
            // whose ideal opposing shot is a tight-overlap step), keep the SOURCE on the
            // side facing its partner and let the TARGET yield to the perpendicular — the
            // edge then leaves toward where its partner actually is.
            -aimU(sU),
            SIDE_ORDER[sU] + SIDE_ORDER[sV],
            SIDE_ORDER[sU],
          ]
          if (!bestKey || lexLess(key, bestKey)) {
            best = { sU, sV }
            bestKey = key
          }
        }
      result.set(endKey(e.edgeId, "source"), best!.sU)
      result.set(endKey(e.edgeId, "target"), best!.sV)

      occAdd(e.sourceNodeId, best!.sU, e.targetNodeId)
      occAdd(e.targetNodeId, best!.sV, e.sourceNodeId)
      placed.push(approxRoute(best!.sU, best!.sV, U, V))
    } else if (e.sourceBand || e.targetBand) {
      // One band end: pick its side to minimise the best achievable corners over the
      // other (cost-path) end, with the same occupancy + aim tie-break.
      const node = e.sourceBand ? e.sourceNodeId : e.targetNodeId
      const otherNode = e.sourceBand ? e.targetNodeId : e.sourceNodeId
      const aim = e.sourceBand ? aimU : aimV
      let best: Position | null = null
      let bestKey: number[] | null = null
      for (const s of SIDES) {
        // Only the BENDS are evaluated over the other end here: that end is still free
        // (the per-edge cost path picks it, obstacle-aware, later), so a node-crossing
        // count taken from a guessed partner side would be misleading — the real route
        // is not committed to it.
        let minB = Infinity
        for (const o of SIDES) {
          const b = e.sourceBand
            ? combinedBends(s, o, U, V)
            : combinedBends(o, s, U, V)
          if (b < minB) minB = b
        }
        const key = [
          minB,
          -aim(s),
          occOthers(node, s, otherNode),
          SIDE_ORDER[s],
        ]
        if (!bestKey || lexLess(key, bestKey)) {
          best = s
          bestKey = key
        }
      }
      result.set(endKey(e.edgeId, e.sourceBand ? "source" : "target"), best!)

      occAdd(node, best!, otherNode)
    }
  }
  return result
}

/** One free end waiting for a slot on a node side: which edge/end it is, the
 * direction to its partner (partner CENTRE minus node CENTRE — memoryless, and
 * the key the angular order sorts on), and a stable id for tie-breaks. */
export type SideMember = {
  edgeId: string
  end: "source" | "target"
  /** partner centre − node centre; the rotation key. */
  dx: number
  dy: number
}

/**
 * A member's position along its side, as ONE monotonic scalar in (−2, 2) that
 * increases with the along-side angle of the partner direction — the rotation
 * around the node. Ordering members by this key makes same-side edges NEST
 * instead of cross (libavoid Thm 3/4: angular order is crossing-minimal for edges
 * sharing a node) and orders a merge so it enters crossing-free.
 *
 * Projected into the side-local frame (X = outward normal, Y = the tangential
 * axis in display order — left→right on Top/Bottom, top→bottom on Left/Right),
 * the key is `Y/(|X|+|Y|)` in front (X ≥ 0), reflected past ±1 behind it, so it is
 * a monotone function of `atan2(Y, X)` with its ONLY discontinuity (±2) pointing
 * DIRECTLY BEHIND the side — a direction no facing or perpendicular attachment
 * ever takes, so the seam is unreachable in practice.
 *
 * Crucially this is a PER-MEMBER scalar, not a pairwise comparator: sorting by
 * `(key, edgeId)` is transitive and total by construction on every JS engine (the
 * old pairwise cross-product with a denominator-sign guard mixed two keys and was
 * intransitive — a cross-peer determinism hazard). The single division is IEEE
 * correctly-rounded, hence identical across engines.
 */
export const alongSideKey = (
  side: Position,
  dx: number,
  dy: number
): number => {
  let X: number // outward normal component
  let Y: number // tangential component, increasing in display order
  switch (side) {
    case Position.Top:
      X = -dy
      Y = dx
      break
    case Position.Bottom:
      X = dy
      Y = dx
      break
    case Position.Left:
      X = -dx
      Y = dy
      break
    default: // Right
      X = dx
      Y = dy
      break
  }
  const s = Math.abs(X) + Math.abs(Y)
  if (s === 0) return 0
  const f = Y / s // (−1, 1) in front; monotone with atan2(Y, X)
  if (X >= 0) return f
  return Y >= 0 ? 2 - f : -2 - f // reflect the behind half past ±1, seam at ±2
}

/**
 * Order the members sharing one `(node, side)` by their along-side angular key.
 * Same-partner siblings (identical direction) tie and fall to edge id, a total
 * order. Pure and deterministic.
 */
export const orderSideMembers = (
  side: Position,
  members: readonly SideMember[]
): SideMember[] => {
  const keyed = members.map((m) => ({ m, k: alongSideKey(side, m.dx, m.dy) }))
  keyed.sort((a, b) =>
    a.k !== b.k
      ? a.k < b.k
        ? -1
        : 1
      : a.m.edgeId < b.m.edgeId
        ? -1
        : a.m.edgeId > b.m.edgeId
          ? 1
          : 0
  )
  return keyed.map((x) => x.m)
}

/** The axis length (px) of a side of `rect`. */
export const sideAxisLength = (side: Position, rect: Rect): number =>
  isVerticalSide(side) ? rect.height : rect.width

/**
 * One free edge-end that needs a port: which edge/end it is, the node it lands
 * on and that node's rect, the SIDE it was assigned (by the caller — from the
 * cost pass or a geometric rule), and the partner node's CENTRE (the angular key).
 */
export type EndRef = {
  edgeId: string
  end: "source" | "target"
  nodeId: string
  rect: Rect
  side: Position
  partnerCenter: IPoint
  /** The partner node's id and rect — used to detect and align PARALLEL SIBLINGS
   * (several edges between the same node pair), which must share one straight lane
   * band so each is a straight line, not a stepped one. */
  partnerNodeId: string
  partnerRect: Rect
  /** The side the OTHER end of this edge attaches to, when that end is also assigned
   * here. A same-partner bundle that turns a corner only nests when the two ends run in
   * the right relative order, and which order that is depends on both sides (see
   * `bundleNeedsMirror`). Absent ⇒ the partner end is on the cost path; no mirror. */
  partnerSide?: Position
  /** Ends sharing a defined `mergeKey` on the same `(node, side)` collapse onto ONE
   * port, so their arrowheads OVERLAY into a single mark. The caller decides what may
   * merge (today: the UML generalisation/realisation arrowhead — see
   * `MERGED_ARROWHEAD_EDGE_TYPES`); this module just honours it, so the geometry stays
   * free of diagram semantics. Absent ⇒ this end never shares its port. */
  mergeKey?: string
  /** A FOUR-CENTRE node (activity/BPMN/flowchart-decision/petri) can only attach at
   * the side MIDPOINT, so its port is always ratio 0.5 — the band does not apply and
   * several edges on one such side collapse (the cost side-pass distributes them
   * across sides instead). Freeform nodes (class, component, …) leave this false. */
  fourCenter?: boolean
}

/** +1 when this side's display order (Top/Bottom left→right, Left/Right top→bottom)
 * runs the same way as a CLOCKWISE walk of the rectangle, −1 when it runs against it.
 * Clockwise is Top l→r, Right t→b, Bottom r→l, Left b→t. */
const clockwiseSign = (side: Position): number =>
  side === Position.Top || side === Position.Right ? 1 : -1

/**
 * Whether a same-partner BUNDLE must run in OPPOSITE along-side order at its two ends
 * to stay nested (rather than twisting into crossings).
 *
 * Think of the two nodes as meshing gears: a ribbon of parallel edges keeps its strands
 * nested when the two attachment sides are traversed in OPPOSITE rotational senses. So
 * when both sides' display orders agree with the clockwise walk (or both disagree), the
 * ends must be mirrored; when one agrees and the other does not, the display orders
 * already oppose and the SAME order nests.
 *
 * This replaces an arbitrary "reverse at the higher-id node", which mirrored a bundle
 * that should not have been — the two edges then crossed and the router drew a loop
 * around the crossing (d61's A↔B pair).
 */
const bundleNeedsMirror = (side: Position, partnerSide: Position): boolean =>
  clockwiseSign(side) === clockwiseSign(partnerSide)

/** The port chosen for one end: its side (unchanged from the input) and the
 * along-side ratio from the centred band. */
export type AssignedPort = { side: Position; ratio: number }

/** Key for one end in the returned map: `${edgeId}|${end}`. */
export const endKey = (edgeId: string, end: "source" | "target"): string =>
  `${edgeId}|${end}`

/**
 * The shared straight band for K parallel siblings between `rect`'s `side` and the
 * DIRECTLY-OPPOSING, OVERLAPPING side of `partner` — an ABSOLUTE interval along the
 * tangential axis (X for Top/Bottom, Y for Left/Right) plus this rect's low corner
 * and axis length. `null` when the sides do not oppose or do not overlap enough to
 * seat both anchors clear of the corners.
 *
 * Because the interval depends on the two rects symmetrically and this helper is run
 * for BOTH ends of each sibling, the source-side and target-side groups compute the
 * IDENTICAL absolute band — so a lane placed at absolute coordinate `c` maps to the
 * matching ratio at each node and the sibling is a straight line, not a stepped one.
 */
const sharedStraightBand = (
  side: Position,
  rect: Rect,
  partner: Rect
): { lo: number; hi: number; myLo: number; myAxis: number } | null => {
  // `side` must genuinely face the partner as a straight shot (0 bends). Because
  // `assignSides` gives a straight-eligible edge a 0-bend OPPOSING pair, the partner is
  // on the directly-opposing side, so this end and the partner's end compute the same
  // absolute band and their ports align.
  if (bendsForSide(side, rect, partner) !== 0) return null
  const tangentialX = !isVerticalSide(side) // Top/Bottom slide along X
  const myLo = tangentialX ? rect.x : rect.y
  const myAxis = tangentialX ? rect.width : rect.height
  const pLo = tangentialX ? partner.x : partner.y
  const pAxis = tangentialX ? partner.width : partner.height
  const overlapLo = Math.max(myLo, pLo)
  const overlapHi = Math.min(myLo + myAxis, pLo + pAxis)
  // Match `bendsForSide`/`combinedBends`: a straight lane needs REAL overlap, not a few
  // px that would corner-jam into a step. Below the threshold there is no straight lane
  // (assignSides won't have chosen this side pair anyway).
  if (overlapHi - overlapLo < MIN_STRAIGHT_OVERLAP_PX) return null
  // Keep the band clear of the corners, but never past the overlap centre: a thin
  // overlap still yields a (single-point) straight lane rather than losing straightness.
  const margin = Math.min(
    CORNER_CLEARANCE_PX,
    Math.min(myAxis, pAxis) * 0.3,
    (overlapHi - overlapLo) / 2
  )
  return { lo: overlapLo + margin, hi: overlapHi - margin, myLo, myAxis }
}

/**
 * K coordinates spread EVENLY across `[lo, hi]` — the same gap between neighbouring
 * ports AND between the outermost ports and the ends, i.e. port `i` at
 * `lo + span·(i+1)/(K+1)`. Two ports therefore split the side into three equal
 * stretches rather than huddling a fixed pitch apart around the centre.
 *
 * This is ELK's `DISTRIBUTED` port alignment ("evenly distributed, with the same
 * amount of space between and around them") — its default, and what reads as
 * deliberate rather than accidental. The spread is symmetric about the centre, so it
 * keeps the anti-corner-jam property of a centred band.
 *
 * `minGap` only kicks in when the side is too crowded for an even spread to stay
 * legible: below it the ports compress to that gap around the centre instead, so a
 * busy side degrades gracefully rather than smearing into one line.
 */
const spreadCoords = (
  lo: number,
  hi: number,
  count: number,
  minGap: number
): number[] => {
  if (count <= 0) return []
  const centre = (lo + hi) / 2
  if (count === 1) return [centre]
  const gap = clamp((hi - lo) / (count + 1), minGap, MAX_PORT_GAP_PX)
  return Array.from(
    { length: count },
    (_, i) => centre + ((2 * i - (count - 1)) * gap) / 2
  )
}

/**
 * Assign a concrete port to every end passed in — these are the free ends of
 * MULTI-EDGE nodes, whose side the caller has already fixed GEOMETRICALLY (the
 * facing sector), so a fork splits across sides by direction with no cost tie to
 * fight. Groups the ends by their `(node, side)`, and per group:
 *  - CROWDED (>1 on the side): order by the angular rotation rule and seat the
 *    ports in a CENTRED band — so several edges sharing a side nest and space
 *    themselves instead of piling onto one corner-aimed anchor.
 *  - LONE on the side (a single distributed fork arm): aim it at its own partner.
 *  - FOUR-CENTRE node: the fixed side midpoint (0.5).
 *
 * This ONE function replaces the whole multi-edge rule stack — node-side fans, the
 * dir mirror, lane offsets, slots, the fork redistributor — because fork splitting
 * (geometric side), nesting (angular order) and spacing (the band) all emerge from
 * it. Pure and deterministic: a given geometry yields the identical ports on every
 * peer. Single-edge nodes are not passed here; they stay on the per-edge cost path.
 */
export const assignPorts = (
  ends: readonly EndRef[],
  pitchPx: number = PORT_PITCH_PX
): Map<string, AssignedPort> => {
  // group by node|side
  const groups = new Map<string, EndRef[]>()
  for (const e of ends) {
    const key = `${e.nodeId}|${e.side}`
    const g = groups.get(key)
    if (g) g.push(e)
    else groups.set(key, [e])
  }
  const result = new Map<string, AssignedPort>()
  for (const [, group] of groups) {
    const side = group[0].side
    const rect = group[0].rect
    const nodeId = group[0].nodeId
    if (group[0].fourCenter) {
      for (const e of group)
        result.set(endKey(e.edgeId, e.end), { side, ratio: 0.5 })
      continue
    }

    const axis = sideAxisLength(side, rect)
    const tangentialX = !isVerticalSide(side)
    const myLo = tangentialX ? rect.x : rect.y
    const margin = Math.min(CORNER_CLEARANCE_PX, axis * 0.3)

    // Every port gets a DESIRED absolute coordinate along the side, then a single
    // min-gap pass separates them. Two régimes, decided per PARTNER (not per group):
    //  - STRAIGHT-eligible (the partner's opposing side overlaps): the shared straight
    //    band's aligned coordinate, so this port and the partner's port land on the same
    //    absolute coordinate and the edge is a STRAIGHT line. This holds even when the
    //    side carries edges to OTHER partners — each straight edge keeps its own lane.
    //  - otherwise an L: the partner-aimed coordinate, pulled toward the side centre so
    //    a fork of L's stays legible rather than jammed into a corner.
    // Straightness is thus decided before spacing (the cited "reserve the aligned lane"
    // rule), and it no longer requires the whole side to share one partner.
    type Seat = {
      edgeId: string
      end: "source" | "target"
      coord: number
      fixed: boolean
      /** The angular rotation key of this end's partner direction — the NON-CROSSING
       * order along the side (libavoid Thm 3). Breaks a desired-coordinate tie, so two
       * edges wanting the same spot are separated in the order that does not tangle
       * them, rather than by an arbitrary id. */
      rot: number
    }
    // MERGE first: ends sharing a `mergeKey` on this side collapse to ONE unit, so a
    // UML generalisation fan draws a single shared arrowhead instead of a spread of
    // parallel ones. The unit is placed like any other port and its coordinate is then
    // handed back to every member, which is what makes the marks overlay exactly.
    const unitMembers = new Map<string, EndRef[]>()
    for (const e of group) {
      const key =
        e.mergeKey === undefined
          ? `solo:${endKey(e.edgeId, e.end)}`
          : `merge:${e.mergeKey}`
      const u = unitMembers.get(key)
      if (u) u.push(e)
      else unitMembers.set(key, [e])
    }
    // One representative per unit — the smallest edge id, so the choice is
    // deterministic — carrying the fan's CENTROID as its partner direction so the
    // merged port sits where the fan actually pulls.
    const units: EndRef[] = []
    const membersOfRep = new Map<string, EndRef[]>()
    for (const members of unitMembers.values()) {
      const ordered = [...members].sort((a, b) =>
        a.edgeId < b.edgeId ? -1 : a.edgeId > b.edgeId ? 1 : 0
      )
      const rep = ordered[0]
      if (ordered.length === 1) {
        units.push(rep)
        membersOfRep.set(endKey(rep.edgeId, rep.end), ordered)
        continue
      }
      const cx =
        ordered.reduce((t, m) => t + m.partnerCenter.x, 0) / ordered.length
      const cy =
        ordered.reduce((t, m) => t + m.partnerCenter.y, 0) / ordered.length
      units.push({
        ...rep,
        partnerCenter: { x: cx, y: cy },
        // A merged unit answers to several partners, so it is never a straight lane —
        // give it a partner id of its own so it forms one L unit.
        partnerNodeId: `merged:${rep.mergeKey}`,
      })
      membersOfRep.set(endKey(rep.edgeId, rep.end), ordered)
    }

    const seats: Seat[] = []
    const rotOf = (e: EndRef): number => {
      const c = centerOf(e.rect)
      return alongSideKey(
        side,
        e.partnerCenter.x - c.x,
        e.partnerCenter.y - c.y
      )
    }
    const byPartner = new Map<string, EndRef[]>()
    for (const e of units) {
      const g = byPartner.get(e.partnerNodeId)
      if (g) g.push(e)
      else byPartner.set(e.partnerNodeId, [e])
    }
    // STRAIGHT-eligible members (the partner's opposing side overlaps enough) keep the
    // shared band's ALIGNED coordinate, so this port and the partner's port land on the
    // same absolute coordinate and the edge is a straight line — straightness is decided
    // before spacing, and holds even when the side carries edges to other partners.
    const lMembers: { e: EndRef; rot: number }[] = []
    for (const [partnerId, members] of byPartner) {
      const band = sharedStraightBand(side, rect, members[0].partnerRect)
      if (band) {
        const ordered = [...members].sort((a, b) =>
          a.edgeId < b.edgeId ? -1 : a.edgeId > b.edgeId ? 1 : 0
        )
        const coords = spreadCoords(band.lo, band.hi, ordered.length, pitchPx)
        ordered.forEach((e, i) =>
          seats.push({
            edgeId: e.edgeId,
            end: e.end,
            coord: coords[i],
            fixed: true,
            rot: rotOf(e),
          })
        )
        continue
      }
      // L member(s) to this partner. A same-partner BUNDLE turning a corner nests only
      // when its two ends run in the right relative order — decided geometrically from
      // the two sides (see `bundleNeedsMirror`), applied at ONE end (the higher-id node)
      // so the two ends agree deterministically.
      const sm: SideMember[] = members.map((e) => ({
        edgeId: e.edgeId,
        end: e.end,
        dx: e.partnerCenter.x - centerOf(e.rect).x,
        dy: e.partnerCenter.y - centerOf(e.rect).y,
      }))
      let ordered = orderSideMembers(side, sm)
      const partnerSide = members[0].partnerSide
      if (
        members.length > 1 &&
        nodeId > partnerId &&
        partnerSide !== undefined &&
        bundleNeedsMirror(side, partnerSide)
      )
        ordered = [...ordered].reverse()
      const byKey = new Map(members.map((e) => [endKey(e.edgeId, e.end), e]))
      // Keep this partner-block's internal order by nudging the rot key per rank; the
      // blocks themselves are then interleaved by their true angular key below.
      ordered.forEach((m, i) => {
        const e = byKey.get(endKey(m.edgeId, m.end))!
        lMembers.push({ e, rot: rotOf(e) + i * 1e-6 })
      })
    }

    // The L ports sit in ONE CENTRED BAND, ordered by the angular rotation of their
    // partners. The partner direction decides the ORDER, never the absolute position:
    // aiming the position at the partner drags the whole band toward a corner whenever
    // the partners happen to lie to one side (d57/d58/d62), while contributing nothing
    // an even spread in rotation order does not already give. This is the cited rule —
    // "the order along a side is the circular order of the segments; then distribute the
    // ports evenly" (Hegemann-Wolff) — and it makes corner-jam structurally impossible.
    lMembers.sort((a, b) =>
      a.rot !== b.rot ? a.rot - b.rot : a.e.edgeId < b.e.edgeId ? -1 : 1
    )
    const lCoords = spreadCoords(
      myLo + margin,
      myLo + axis - margin,
      lMembers.length,
      pitchPx
    )
    lMembers.forEach(({ e, rot }, i) => {
      seats.push({
        edgeId: e.edgeId,
        end: e.end,
        coord: lCoords[i],
        fixed: false,
        rot,
      })
    })

    // One deterministic min-gap pass over all ports on the side, in coordinate order.
    // Fixed (straight) lanes hold their coordinate unless genuinely crowded; the pass
    // only pushes to keep a minimum separation and clears the corners.
    seats.sort((a, b) =>
      a.coord !== b.coord
        ? a.coord - b.coord
        : a.rot !== b.rot
          ? a.rot - b.rot
          : a.edgeId < b.edgeId
            ? -1
            : 1
    )
    const lo = myLo + margin
    const hi = myLo + axis - margin
    const gap =
      seats.length > 1 ? Math.min(pitchPx, (hi - lo) / (seats.length - 1)) : 0
    const pos = seats.map((s) => clamp(s.coord, lo, hi))
    for (let i = 1; i < pos.length; i++)
      if (pos[i] < pos[i - 1] + gap) pos[i] = pos[i - 1] + gap
    if (pos.length && pos[pos.length - 1] > hi) {
      pos[pos.length - 1] = hi
      for (let i = pos.length - 2; i >= 0; i--)
        if (pos[i] > pos[i + 1] - gap) pos[i] = pos[i + 1] - gap
    }
    // ratio = (absolute coord − low corner) / axis. A merged unit hands its ratio to
    // every member, so their arrowheads land on the identical point.
    seats.forEach((s, i) => {
      const ratio = (clamp(pos[i], lo, hi) - myLo) / axis
      const members = membersOfRep.get(endKey(s.edgeId, s.end)) ?? []
      for (const m of members)
        result.set(endKey(m.edgeId, m.end), { side, ratio })
    })
  }
  return result
}

// Re-exported so callers share one clearance source with the router.
export { CORNER_CLEARANCE_PX }
export const _internal = { isVerticalSide, centerOf, EDGES }
