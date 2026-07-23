import { Position, type Rect } from "@xyflow/system"
import { CANVAS } from "@/utils/geometry/routingConstants"
import { clamp, lexLess } from "@/utils/geometry/scalar"
import type { IPoint } from "@/edges/Connection"
import {
  balancedPortOffsets,
  polylineConflictCost,
  ROUTING_COST,
} from "@/utils/geometry/routingCost"
import {
  ALL_SIDES,
  OUTWARD_NORMAL,
  SIDE_ORDER,
  centerOf,
  isVerticalSide,
  sideAxisLength,
  canRunStraight,
  cornerMargin,
} from "@/utils/geometry/rectSides"

/**
 * PORT ASSIGNMENT — for every free edge-end landing on a node side, its ORDER along
 * that side and its POSITION on it. Partner direction decides the side and the order;
 * positions are then spread in a centred band, never aimed at the partner (aiming is
 * what jams anchors into corners). Forks, bundles and nesting all fall out of that one
 * rotation order. See `./README.md` for the evidence behind it.
 *
 * Every decision is a pure function of the current geometry and totally ordered, so two
 * peers and a reload assign identical ports — which is why the arithmetic stays within
 * the exactly-rounded IEEE-754 operations and never touches `atan2` or `hypot`.
 */

const GRID = CANVAS.SNAP_TO_GRID_PX

/** Preferred gap between adjacent ports on a side, in px. Kept small so a shared
 * side reads as a tight centred band, not anchors flung to the corners (ELK's
 * `portPort` default is 10, yFiles' border-gap ratio 0.5, Hegemann–Wolff 18). */
export const PORT_PITCH_PX = 3 * GRID

/** Minimum gap kept between the outermost port and a corner — a corner anchor
 * makes the first segment graze the node it just left. */
const CORNER_CLEARANCE_PX = 2 * GRID

/** How many corners an open-space crossing is worth when side assignment weighs the two
 * against each other. Derived from the same canonical pixel objective as A*, so this
 * approximate pass cannot recommend a crossing that the exact route would reject. */
const CROSSING_BEND_EQUIV =
  ROUTING_COST.edgeCrossing /
  (ROUTING_COST.bendInGridCells * CANVAS.SNAP_TO_GRID_PX)

/**
 * The number of CORNERS an edge would take to leave `side` of `rect` toward
 * `partner` — the obstacle-free bend count from Wybrow et al. (GD'09), reduced to
 * the two rectangles here since ports slide within a side:
 *   - the side faces AWAY from the partner (its outward normal · direction ≤ 0) → 3
 *     (a U-turn); such a side is never the minimum,
 *   - the side faces the partner AND the two opposing sides' extents OVERLAP on the
 *     perpendicular axis → 0 (a straight shot: the port slides to align),
 *   - the side faces the partner but the extents do NOT overlap → 1 (a clean L).
 * A dot product of side normals with a centre difference: exactly-rounded throughout,
 * so peers agree.
 */
const bendsForSide = (side: Position, rect: Rect, partner: Rect): number => {
  const c = centerOf(rect)
  const p = centerOf(partner)
  const n = OUTWARD_NORMAL[side]
  const along = n.x * (p.x - c.x) + n.y * (p.y - c.y)
  if (along <= 0) return 3
  return canRunStraight(isVerticalSide(side), rect, partner) ? 0 : 1
}

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
 * Exactly-rounded throughout, so peers agree.
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
    return canRunStraight(isVerticalSide(sU), U, V) ? 0 : 2
  if (nU.x === nV.x && nU.y === nV.y) return 2
  return 1 // perpendicular
}

/** Compare two strings to a TOTAL order — 0 when equal. Returning a non-zero value
 * for equal keys violates the comparator contract and makes the result engine-defined
 * (V8 and SpiderMonkey differ), which would break cross-peer agreement. */
const cmpStr = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0)

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

/** Whether the axis-aligned segment a→b passes through the INTERIOR of `r` (a small
 * inset so merely grazing a border does not count). */
const segCutsRect = (a: IPoint, b: IPoint, r: Rect): boolean => {
  const lo = { x: r.x + 1, y: r.y + 1 }
  const hi = { x: r.x + r.width - 1, y: r.y + r.height - 1 }
  return (
    Math.min(a.x, b.x) < hi.x &&
    Math.max(a.x, b.x) > lo.x &&
    Math.min(a.y, b.y) < hi.y &&
    Math.max(a.y, b.y) > lo.y
  )
}

export const routeCutsAny = (
  route: readonly IPoint[],
  rects: readonly Rect[]
): number => {
  let n = 0
  for (const r of rects)
    for (let i = 0; i < route.length - 1; i++)
      if (segCutsRect(route[i], route[i + 1], r)) {
        n++
        break
      }
  return n
}

/**
 * Pick the connecting-lane coordinate for a Z/U route. `anchor` is the tightest feasible
 * value (the nearer stub coordinate); `dir` is the sign the lane may move away from it
 * (−1 the lane may only DECREASE, +1 only INCREASE, 0 it is pinned BETWEEN the two stubs).
 * Among the anchor and the far edge of every obstacle the lane can slide onto, pick the
 * route with the fewest node hits, nearest the anchor — the shape the real router dodges
 * to, instead of a naive line straight through a node. Falls back to the anchor.
 */
const pickLane = (
  anchor: number,
  betweenOther: number,
  dir: -1 | 0 | 1,
  edgeOf: (r: Rect) => [number, number],
  makeRoute: (lane: number) => IPoint[],
  rects: readonly Rect[]
): number => {
  const feasible = (c: number): boolean =>
    dir === 0
      ? c >= Math.min(anchor, betweenOther) &&
        c <= Math.max(anchor, betweenOther)
      : dir > 0
        ? c >= anchor
        : c <= anchor
  const cands = new Set<number>([anchor])
  if (dir === 0) cands.add((anchor + betweenOther) / 2)
  for (const r of rects)
    for (const e of edgeOf(r)) if (feasible(e)) cands.add(e)
  let best = anchor
  let bestHits = Infinity
  let bestDist = Infinity
  for (const c of [...cands].sort((p, q) => p - q)) {
    const hits = routeCutsAny(makeRoute(c), rects)
    const dist = Math.abs(c - anchor)
    if (hits < bestHits || (hits === bestHits && dist < bestDist)) {
      best = c
      bestHits = hits
      bestDist = dist
    }
  }
  return best
}

/** For a Z/U route on a given axis, the lane's tightest feasible value and the direction
 * it may slide, from the two ends' side normals (component along the lane's axis). */
const laneConstraint = (
  nU: number,
  nV: number,
  aCoord: number,
  bCoord: number
): { anchor: number; other: number; dir: -1 | 0 | 1 } => {
  // nU/nV are the two outward-normal components on the lane's axis: −1 leaves toward
  // smaller coords, +1 toward larger. Same sign ⇒ the lane runs OUTWARD past both
  // (a U); opposite signs ⇒ it sits BETWEEN them (a Z).
  if (nU < 0 && nV < 0)
    return {
      anchor: Math.min(aCoord, bCoord),
      other: Math.max(aCoord, bCoord),
      dir: -1,
    }
  if (nU > 0 && nV > 0)
    return {
      anchor: Math.max(aCoord, bCoord),
      other: Math.min(aCoord, bCoord),
      dir: 1,
    }
  return { anchor: aCoord, other: bCoord, dir: 0 }
}

/**
 * The APPROXIMATE orthogonal polyline a side pair would produce, drawn between the two
 * side midpoints and — crucially — DODGING the obstacle nodes the same way the real
 * router will. Used to compare candidates for node-crossings and edge-crossings at
 * side-assignment time; positions are not chosen yet, so this is the shape, not the
 * final route. A Z route's connecting lane is slid into the gap beside a blocking node so
 * the estimate no longer condemns a clean side just because its naive straight line
 * happened to clip a node in the middle.
 */
export const approxRoute = (
  sU: Position,
  sV: Position,
  U: Rect,
  V: Rect,
  obstacles: readonly Rect[] = []
): IPoint[] => {
  const a = sideMidpoint(sU, U)
  const b = sideMidpoint(sV, V)
  const uVert = isVerticalSide(sU) // left/right ⇒ leaves horizontally
  const vVert = isVerticalSide(sV)
  if (uVert !== vVert)
    // Perpendicular: one corner, on the axis each end leaves along.
    return uVert ? [a, { x: b.x, y: a.y }, b] : [a, { x: a.x, y: b.y }, b]
  if (uVert) {
    // Both horizontal-leaving: straight when the ys match, else a vertical connecting
    // lane (Z between them, or U past both) slid to dodge obstacles.
    if (a.y === b.y) return [a, b]
    const { anchor, other, dir } = laneConstraint(
      OUTWARD_NORMAL[sU].x,
      OUTWARD_NORMAL[sV].x,
      a.x,
      b.x
    )
    const laneX = pickLane(
      anchor,
      other,
      dir,
      (r) => [r.x - CORNER_CLEARANCE_PX, r.x + r.width + CORNER_CLEARANCE_PX],
      (x) => [a, { x, y: a.y }, { x, y: b.y }, b],
      obstacles
    )
    return [a, { x: laneX, y: a.y }, { x: laneX, y: b.y }, b]
  }
  if (a.x === b.x) return [a, b]
  const { anchor, other, dir } = laneConstraint(
    OUTWARD_NORMAL[sU].y,
    OUTWARD_NORMAL[sV].y,
    a.y,
    b.y
  )
  const laneY = pickLane(
    anchor,
    other,
    dir,
    (r) => [r.y - CORNER_CLEARANCE_PX, r.y + r.height + CORNER_CLEARANCE_PX],
    (y) => [a, { x: a.x, y }, { x: b.x, y }, b],
    obstacles
  )
  return [a, { x: a.x, y: laneY }, { x: b.x, y: laneY }, b]
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
  /** Immutable side of a non-band endpoint, when customization fixed it. */
  sourceFixedSide?: Position
  targetFixedSide?: Position
}

export type ReservedSideEnd = {
  nodeId: string
  partnerNodeId: string
  side: Position
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
  nodeRects: ReadonlyMap<string, Rect> = new Map(),
  /** Nodes whose sides hold only ONE port (four-centre: interface, gateway, decision,
   * merge, …). Putting a second edge on such a side collides both at the side midpoint,
   * so it is treated as a hard conflict rather than a soft occupancy tie-break. */
  fourCenterNodes: ReadonlySet<string> = new Set(),
  /** Customized endpoints already consuming node-side capacity. */
  reservedEnds: readonly ReservedSideEnd[] = [],
  /** Immutable route topology, considered before choosing generated sides. */
  reservedRoutes: readonly IPoint[][] = []
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
  for (const end of reservedEnds)
    occAdd(end.nodeId, end.side, end.partnerNodeId)
  // On a four-centre node a side already carrying an edge to a DIFFERENT partner is a
  // COLLISION (both would sit at the same side midpoint), so it is a hard conflict; on a
  // freeform node the same count is only a soft spacing tie-break.
  const singleSlotOcc = (
    node: string,
    side: Position,
    exclude: string
  ): number => (fourCenterNodes.has(node) ? occOthers(node, side, exclude) : 0)

  const hasStraight = (e: SideEdge): boolean =>
    ALL_SIDES.some((sU) =>
      ALL_SIDES.some(
        (sV) => combinedBends(sU, sV, e.sourceRect, e.targetRect) === 0
      )
    )
  // Straight edges lock aligned opposing sides first. Within that class, route
  // semantically distinct geometry in a geometry-derived order; an edge's storage id
  // may only break a genuinely coincident tie. Otherwise renaming an edge can change
  // which arm of a fan claims a clean side or corridor.
  const ordered = [...edges].sort((a, b) => {
    const sa = hasStraight(a) ? 0 : 1
    const sb = hasStraight(b) ? 0 : 1
    if (sa !== sb) return sa - sb
    const ak: Array<number | string> = [
      a.sourceRect.x,
      a.sourceRect.y,
      a.sourceRect.width,
      a.sourceRect.height,
      a.targetRect.x,
      a.targetRect.y,
      a.targetRect.width,
      a.targetRect.height,
      a.sourceNodeId,
      a.targetNodeId,
      a.edgeId,
    ]
    const bk: Array<number | string> = [
      b.sourceRect.x,
      b.sourceRect.y,
      b.sourceRect.width,
      b.sourceRect.height,
      b.targetRect.x,
      b.targetRect.y,
      b.targetRect.width,
      b.targetRect.height,
      b.sourceNodeId,
      b.targetNodeId,
      b.edgeId,
    ]
    for (let i = 0; i < ak.length; i++) {
      if (ak[i] === bk[i]) continue
      return ak[i] < bk[i] ? -1 : 1
    }
    return 0
  })

  // Approximate shapes of the edges already assigned, so a later edge can prefer a side
  // pair that does NOT cross them. Edges that SHARE a node are included: they converge
  // at that node (which costs nothing — the strict `between` test ignores touching
  // endpoints) but can still genuinely cross out in the open, which is d59's defect.
  const placed: IPoint[][] = reservedRoutes.map((route) => [...route])
  const routeConflictBendEquiv = (route: IPoint[]): number => {
    let crossings = 0
    let nonCrossingCost = 0
    placed.forEach((neighbor, index) => {
      const conflict = polylineConflictCost(
        route,
        [neighbor],
        ROUTING_COST.parallelCrowdingClearanceInGridCells * GRID
      )
      crossings += conflict.crossings
      // Approximate generated routes share side midpoints before assignPorts
      // spreads them. Charging that temporary overlap would split a clean bundle
      // across sides. Immutable authored routes, however, reserve real space.
      if (index < reservedRoutes.length)
        nonCrossingCost +=
          conflict.overlapPx * ROUTING_COST.overlapPerPx +
          conflict.crowdingPx * ROUTING_COST.crowdingPerPx
    })
    return (
      CROSSING_BEND_EQUIV * crossings +
      nonCrossingCost / (ROUTING_COST.bendInGridCells * GRID)
    )
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

  const result = new Map<string, Position>()
  for (const e of ordered) {
    const { sourceRect: U, targetRect: V } = e
    const dx = centerOf(V).x - centerOf(U).x
    const dy = centerOf(V).y - centerOf(U).y
    const aimU = (s: Position): number =>
      Math.abs(OUTWARD_NORMAL[s].x * dx + OUTWARD_NORMAL[s].y * dy)
    const aimV = (s: Position): number =>
      Math.abs(OUTWARD_NORMAL[s].x * -dx + OUTWARD_NORMAL[s].y * -dy)

    // Third nodes this edge must route around — everything but its own two ends. The
    // approx route dodges these, so the key's node/edge-crossing counts reflect the route
    // the real router draws, not a naive straight line clipped by a node in the middle.
    const obstacles: Rect[] = []
    for (const [id, r] of nodeRects)
      if (id !== e.sourceNodeId && id !== e.targetNodeId) obstacles.push(r)

    if (e.sourceBand && e.targetBand) {
      let best: { sU: Position; sV: Position } | null = null
      let bestKey: number[] | null = null
      for (const sU of ALL_SIDES)
        for (const sV of ALL_SIDES) {
          const route = approxRoute(sU, sV, U, V, obstacles)
          const key = [
            // A route driven through another node is the worst thing side assignment can
            // choose — far worse than a bend — so it leads the key. Counted on the DODGED
            // route, so a side is only condemned when the node is genuinely unavoidable.
            nodesCrossed(e, route),
            // A second edge on a four-centre side collides both at that midpoint — as bad
            // as a node crossing, so it leads too. Spreads interface/gateway/decision edges
            // across their four sides instead of piling onto the one facing the partner.
            singleSlotOcc(e.sourceNodeId, sU, e.targetNodeId) +
              singleSlotOcc(e.targetNodeId, sV, e.sourceNodeId),
            // Corners AND crossings share one budget: a crossing costs CROSSING_BEND_EQUIV
            // bends (ten at the current canonical scale), so a
            // crossing-free route wins over one that saves a corner by cutting across an
            // edge already placed — the d59/d74/d75 defect where the cheaper-looking side
            // tangled a neighbour. This budget outranks aim: an untangled picture beats
            // keeping an edge on its most-facing side.
            combinedBends(sU, sV, U, V) + routeConflictBendEquiv(route),
            // Raw-direction alignment: keep an edge on the side its partner lies toward so
            // two same-direction edges bundle. Breaks ties left by the corner/crossing
            // budget.
            -(aimU(sU) + aimV(sV)),
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
      placed.push(approxRoute(best!.sU, best!.sV, U, V, obstacles))
    } else if (e.sourceBand || e.targetBand) {
      // One band end: pick its side to minimise the best achievable corners over the
      // other (cost-path) end, with the same occupancy + aim tie-break.
      const node = e.sourceBand ? e.sourceNodeId : e.targetNodeId
      const otherNode = e.sourceBand ? e.targetNodeId : e.sourceNodeId
      const aim = e.sourceBand ? aimU : aimV
      let best: Position | null = null
      let bestKey: number[] | null = null
      for (const s of ALL_SIDES) {
        // Only the BENDS are evaluated over the other end here: that end is still free
        // (the per-edge cost path picks it, obstacle-aware, later), so a node-crossing
        // count taken from a guessed partner side would be misleading — the real route
        // is not committed to it.
        const otherFixedSide = e.sourceBand
          ? e.targetFixedSide
          : e.sourceFixedSide
        let minB = Infinity
        if (otherFixedSide !== undefined) {
          const route = e.sourceBand
            ? approxRoute(s, otherFixedSide, U, V, obstacles)
            : approxRoute(otherFixedSide, s, U, V, obstacles)
          minB =
            (e.sourceBand
              ? combinedBends(s, otherFixedSide, U, V)
              : combinedBends(otherFixedSide, s, U, V)) +
            routeConflictBendEquiv(route)
        } else {
          for (const o of ALL_SIDES) {
            const route = e.sourceBand
              ? approxRoute(s, o, U, V, obstacles)
              : approxRoute(o, s, U, V, obstacles)
            const b =
              (e.sourceBand
                ? combinedBends(s, o, U, V)
                : combinedBends(o, s, U, V)) + routeConflictBendEquiv(route)
            if (b < minB) minB = b
          }
        }
        const key = [
          // A four-centre side already taken is a collision, not a tie-break — it leads,
          // so a second edge to this single-slot node picks a FREE side (d76's interface
          // put both dependencies on its left; now they split across two sides).
          singleSlotOcc(node, s, otherNode),
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
 * around the node. Ordering members by this key is a stable heuristic that makes
 * same-side fans nest instead of cross and orders a merge so it enters
 * crossing-free.
 *
 * Projected into the side-local frame (X = outward normal, Y = the tangential
 * axis in display order — left→right on Top/Bottom, top→bottom on Left/Right),
 * the key is `Y/(|X|+|Y|)` in front (X ≥ 0), reflected past ±1 behind it, so it is
 * a monotone function of `atan2(Y, X)` with its ONLY discontinuity (±2) pointing
 * DIRECTLY BEHIND the side — a direction no facing or perpendicular attachment
 * ever takes, so the seam is unreachable in practice.
 *
 * A per-member scalar, not a pairwise comparator, so sorting by `(key, id)` is total
 * and transitive on every engine. The single division is IEEE correctly-rounded.
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

/** Reach scale (px) for the depth term below. Only its ORDER matters (the term is
 * strictly monotone in reach), so any positive constant works; a node-ish scale keeps
 * the beyond-band edges well separated in float. */
const REACH_ORDER_SCALE_PX = 300

/**
 * The NON-CROSSING order of a port along its side — the key the seat pass sorts on.
 *
 * Angular order alone (`alongSideKey`) is crossing-minimal only for the fan NEAR the
 * node; two edges leaving one side whose ORTHOGONAL routes turn far away can still cross
 * (the nearer-turning one cutting across the farther one's outward run). The order that
 * actually avoids that depends on whether a port can reach the partner's tangential
 * position WITHIN the node's own port band:
 *   - partner tangential inside the band (|T| < halfExtent): the port can sit under it,
 *     so order by that tangential coordinate — the fan spreads across the side;
 *   - partner tangential BEYOND the band (a near-side-parallel edge, |T| ≥ halfExtent):
 *     no port reaches it, so the crossing-free order is by DEPTH — the farther-reaching
 *     edge takes the port on the OPPOSITE side from where it heads, nesting outside the
 *     nearer one instead of being cut by it.
 *
 * Projected into the side-local frame (X = outward normal, Y = tangential in display
 * order). Interior partners map to `Y / halfExtent` ∈ (−1, 1); those beyond the +tangent
 * end to (1, 2] and beyond the −tangent end to [−2, −1), each depth-ordered so the
 * regions never overlap and the sort stays total. One division, IEEE correctly-rounded.
 */
export const crossingOrderKey = (
  side: Position,
  dx: number,
  dy: number,
  tangentialHalfExtent: number
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
  const H = Math.max(tangentialHalfExtent, 1)
  // A partner behind this side still has to wrap around the node before its
  // orthogonal run can reach the port. Its normal depth is therefore |X|, not
  // zero; treating it as zero reverses nested order against an outward partner
  // and pushes both connections into one corner to avoid the manufactured cross.
  const reach = Math.abs(X)
  const r = reach / (reach + REACH_ORDER_SCALE_PX) // [0, 1), monotone in reach
  if (Y >= H) return 2 - r // beyond +tangent end: (1, 2], deeper nests toward 1
  if (Y <= -H) return -2 + r // beyond −tangent end: [−2, −1), deeper nests toward −1
  return Y / H // inside the band: (−1, 1), ordered by tangential position
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
  /** An authored endpoint already occupying this side. The allocator must return
   * this ratio byte-for-byte and seat generated ports around it; unlike a generated
   * straight seat it is never relaxed when the side becomes crowded. */
  immutableRatio?: number
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
 */
const bundleNeedsMirror = (side: Position, partnerSide: Position): boolean =>
  clockwiseSign(side) === clockwiseSign(partnerSide)

/** The port chosen for one end: its side (unchanged from the input) and the
 * along-side ratio from the centred band. */
export type AssignedPort = {
  side: Position
  ratio: number
}

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
  // The same rule the bend counter uses, so a side pair chosen for a straight run
  // always finds a lane here.
  if (!canRunStraight(!tangentialX, rect, partner)) return null
  const margin = cornerMargin(myAxis, pAxis)
  return { lo: overlapLo + margin, hi: overlapHi - margin, myLo, myAxis }
}

/**
 * K coordinates spread EVENLY across `[lo, hi]` — the same gap between neighbouring
 * ports AND between the outermost ports and the ends, i.e. port `i` at
 * `lo + span·(i+1)/(K+1)`. Two ports therefore split the side into three equal
 * stretches rather than huddling a fixed pitch apart around the centre.
 *
 * ELK's default `DISTRIBUTED` alignment (see README). Symmetric about the centre, so
 * it keeps the anti-corner-jam property of a centred band.
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
  const balanced = balancedPortOffsets(count, hi - lo, GRID).map(
    (offset) => lo + offset
  )
  if (balanced[1] - balanced[0] >= minGap) return balanced
  const gap = minGap
  return Array.from(
    { length: count },
    (_, i) => centre + ((2 * i - (count - 1)) * gap) / 2
  )
}

/**
 * The most centred ordered coordinates that stay inside per-port feasible bands.
 * Straight lanes use the intersection of both endpoint sides as their band; moving
 * one outside it manufactures a bend. The small forward/backward projection is a
 * bounded isotonic solve: preserve the visual spread where possible, compress the
 * gap only as far as the bands require, and never leave a band's hard bounds.
 */
const spreadCoordsWithinBounds = (
  lo: number,
  hi: number,
  bounds: readonly { lo: number; hi: number }[],
  minGap: number
): number[] => {
  if (bounds.length === 0) return []
  const ideal = spreadCoords(lo, hi, bounds.length, minGap)
  if (bounds.length === 1) return [clamp(ideal[0], bounds[0].lo, bounds[0].hi)]

  // For ordered intervals, a gap g is feasible iff every earlier lower bound can
  // still precede every later upper bound by (index distance × g).
  let feasibleGap = ideal[1] - ideal[0]
  for (let later = 1; later < bounds.length; later++)
    for (let earlier = 0; earlier < later; earlier++)
      feasibleGap = Math.min(
        feasibleGap,
        (bounds[later].hi - bounds[earlier].lo) / (later - earlier)
      )
  feasibleGap = Math.max(0, feasibleGap)

  const result = ideal.map((value, index) =>
    clamp(value, bounds[index].lo, bounds[index].hi)
  )
  // Alternating projections converge immediately for ordinary disjoint bands; N
  // bounded passes also handles overlapping sibling bands without an unbounded loop.
  for (let pass = 0; pass < bounds.length; pass++) {
    for (let i = 1; i < result.length; i++)
      result[i] = clamp(
        Math.max(result[i], result[i - 1] + feasibleGap),
        bounds[i].lo,
        bounds[i].hi
      )
    for (let i = result.length - 2; i >= 0; i--)
      result[i] = clamp(
        Math.min(result[i], result[i + 1] - feasibleGap),
        bounds[i].lo,
        bounds[i].hi
      )
  }
  return result
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
 * Single-edge nodes are not passed here; they stay on the per-edge cost path.
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
        result.set(endKey(e.edgeId, e.end), {
          side,
          ratio: e.immutableRatio ?? 0.5,
        })
      continue
    }

    const axis = sideAxisLength(side, rect)
    // A node that has not been measured yet has a zero-length side. Dividing by it
    // below would emit NaN ratios, which become NaN endpoint coordinates and leave the
    // router searching for a goal cell keyed on NaN until it exhausts its budget.
    if (axis <= 0) {
      for (const e of group)
        result.set(endKey(e.edgeId, e.end), {
          side,
          ratio: e.immutableRatio ?? 0.5,
        })
      continue
    }
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
      /** Authored reservation: harder than a generated straight seat. */
      immutable: boolean
      /** Feasible absolute interval. A fixed straight seat must remain in the
       * overlap of its two endpoint sides; free L seats use the whole side. */
      minCoord: number
      maxCoord: number
      partnerX: number
      partnerY: number
      partnerWidth: number
      partnerHeight: number
      partnerNodeId: string
      /** The NON-CROSSING order of this port along the side (see `crossingOrderKey`).
       * Drives the seat pass so an edge is seated on the side its route leaves from,
       * and breaks a desired-coordinate tie the same way. */
      rot: number
    }
    const seats: Seat[] = []
    const tangentialHalfExtent = sideAxisLength(side, rect) / 2
    const rotOf = (e: EndRef): number => {
      const c = centerOf(e.rect)
      return crossingOrderKey(
        side,
        e.partnerCenter.x - c.x,
        e.partnerCenter.y - c.y,
        tangentialHalfExtent
      )
    }
    const byPartner = new Map<string, EndRef[]>()
    for (const e of group) {
      const g = byPartner.get(e.partnerNodeId)
      if (g) g.push(e)
      else byPartner.set(e.partnerNodeId, [e])
    }
    const lMembers: { e: EndRef; rot: number; rank: number }[] = []
    for (const [partnerId, members] of byPartner) {
      const band = sharedStraightBand(side, rect, members[0].partnerRect)
      if (band) {
        const ordered = [...members].sort((a, b) =>
          a.edgeId < b.edgeId ? -1 : a.edgeId > b.edgeId ? 1 : 0
        )
        const coords = spreadCoords(band.lo, band.hi, ordered.length, pitchPx)
        ordered.forEach((e, i) => {
          const immutableCoord =
            e.immutableRatio === undefined
              ? null
              : myLo + e.immutableRatio * axis
          seats.push({
            edgeId: e.edgeId,
            end: e.end,
            coord: immutableCoord ?? coords[i],
            fixed: true,
            immutable: immutableCoord !== null,
            minCoord: immutableCoord ?? band.lo,
            maxCoord: immutableCoord ?? band.hi,
            partnerX: e.partnerRect.x,
            partnerY: e.partnerRect.y,
            partnerWidth: e.partnerRect.width,
            partnerHeight: e.partnerRect.height,
            partnerNodeId: e.partnerNodeId,
            rot: rotOf(e),
          })
        })
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
      // Rank within this partner-block is carried as its own field. Folding it into
      // `rot` as a small float nudge would perturb the real angular key by far more
      // than a tie-break needs — `rot` spans (-2, 2), so another partner's true key can
      // fall inside the synthetic window and get spliced into the middle of the block,
      // producing the very crossing the ordering exists to prevent.
      ordered.forEach((m, i) => {
        const e = byKey.get(endKey(m.edgeId, m.end))!
        lMembers.push({ e, rot: rotOf(e), rank: i })
      })
    }

    // The L ports sit in ONE CENTRED BAND, ordered by the angular rotation of their
    // partners. The partner direction decides the ORDER, never the absolute position:
    // aiming the position at the partner drags the whole band toward a corner whenever
    // the partners happen to lie to one side (d57/d58/d62), while contributing nothing
    // an even spread in rotation order does not already give. This is the cited rule —
    // "the order along a side is the circular order of the segments; then distribute the
    // ports evenly" (Hegemann-Wolff) — and it makes corner-jam structurally impossible.
    lMembers.sort(
      (a, b) =>
        a.rot - b.rot ||
        a.rank - b.rank ||
        a.e.partnerRect.x - b.e.partnerRect.x ||
        a.e.partnerRect.y - b.e.partnerRect.y ||
        a.e.partnerRect.width - b.e.partnerRect.width ||
        a.e.partnerRect.height - b.e.partnerRect.height ||
        cmpStr(a.e.partnerNodeId, b.e.partnerNodeId) ||
        cmpStr(a.e.edgeId, b.e.edgeId) ||
        cmpStr(a.e.end, b.e.end)
    )
    const lCoords = spreadCoords(myLo, myLo + axis, lMembers.length, pitchPx)
    lMembers.forEach(({ e, rot }, i) => {
      const immutableCoord =
        e.immutableRatio === undefined ? null : myLo + e.immutableRatio * axis
      seats.push({
        edgeId: e.edgeId,
        end: e.end,
        coord: immutableCoord ?? lCoords[i],
        fixed: immutableCoord !== null,
        immutable: immutableCoord !== null,
        minCoord: immutableCoord ?? myLo + margin,
        maxCoord: immutableCoord ?? myLo + axis - margin,
        partnerX: e.partnerRect.x,
        partnerY: e.partnerRect.y,
        partnerWidth: e.partnerRect.width,
        partnerHeight: e.partnerRect.height,
        partnerNodeId: e.partnerNodeId,
        rot,
      })
    })

    // One deterministic min-gap pass over all ports on the side, in NON-CROSSING order
    // (the `rot` key), not raw coordinate order. Coordinate order alone lets a free L
    // port whose centred desired spot happens to fall on the far side of a fixed straight
    // lane sit in the crossing position — e.g. an edge turning UP toward its partner
    // seated just BELOW a straight lane it then has to cut across. Ordering by `rot`
    // seats each port on the side its route leaves from; a coordinate tie-break keeps
    // same-direction ports in their desired spread. A FIXED seat is a straight lane (its
    // coordinate was derived symmetrically from both nodes so the edge's two ends agree,
    // and moving it here would bend the edge), so fixed seats hold their position and the
    // free seats around them absorb the spacing.
    seats.sort(
      (a, b) =>
        a.rot - b.rot ||
        a.coord - b.coord ||
        a.partnerX - b.partnerX ||
        a.partnerY - b.partnerY ||
        a.partnerWidth - b.partnerWidth ||
        a.partnerHeight - b.partnerHeight ||
        cmpStr(a.partnerNodeId, b.partnerNodeId) ||
        cmpStr(a.edgeId, b.edgeId) ||
        cmpStr(a.end, b.end)
    )
    const lo = myLo + margin
    const hi = myLo + axis - margin
    // When several independently straight-eligible connections meet this side,
    // rebalance them as one centred node-local band. Keeping each partner's aimed
    // coordinate would leave an existing edge unmoved when a new sibling arrives,
    // while commit then has no stable shared capacity model. The opposite free ends
    // receive aligned candidates, so every member remains straight.
    const rebalancesStraightPartners =
      byPartner.size > 1 &&
      seats.length > 1 &&
      seats.every((seat) => seat.fixed)
    if (rebalancesStraightPartners) {
      const centred = spreadCoordsWithinBounds(
        lo,
        hi,
        seats.map((seat) => ({ lo: seat.minCoord, hi: seat.maxCoord })),
        pitchPx
      )
      seats.forEach((seat, index) => {
        seat.coord = centred[index]
      })
    }
    let unconstrainedGap =
      seats.length > 1 ? Math.min(pitchPx, (hi - lo) / (seats.length - 1)) : 0
    const immutableSeats = seats
      .map((seat, index) => ({ seat, index }))
      .filter(({ seat }) => seat.immutable)
    // Authored reservations are hard. Reduce the requested gap when two reserved
    // seats (or a reservation and the mutable side bounds) leave less capacity;
    // never "solve" infeasibility by moving the authored endpoint.
    for (const { seat, index } of immutableSeats) {
      if (index > 0)
        unconstrainedGap = Math.min(
          unconstrainedGap,
          Math.max(0, (seat.coord - lo) / index)
        )
      const after = seats.length - 1 - index
      if (after > 0)
        unconstrainedGap = Math.min(
          unconstrainedGap,
          Math.max(0, (hi - seat.coord) / after)
        )
    }
    for (let later = 1; later < immutableSeats.length; later++)
      for (let earlier = 0; earlier < later; earlier++) {
        const left = immutableSeats[earlier]
        const right = immutableSeats[later]
        unconstrainedGap = Math.min(
          unconstrainedGap,
          Math.max(
            0,
            (right.seat.coord - left.seat.coord) / (right.index - left.index)
          )
        )
      }
    const gap = rebalancesStraightPartners
      ? Math.max(
          0,
          Math.min(
            unconstrainedGap,
            ...seats
              .slice(1)
              .map((seat, index) => seat.coord - seats[index].coord)
          )
        )
      : unconstrainedGap
    const pos = seats.map((s) =>
      s.immutable ? s.coord : clamp(s.coord, lo, hi)
    )
    for (let i = 1; i < pos.length; i++)
      if (!seats[i].fixed && pos[i] < pos[i - 1] + gap)
        pos[i] = pos[i - 1] + gap
    for (let i = pos.length - 2; i >= 0; i--)
      if (!seats[i].fixed && pos[i] > pos[i + 1] - gap)
        pos[i] = pos[i + 1] - gap
    // If the fixed lanes are themselves packed tighter than the gap — several parallel
    // siblings sharing one narrow band — holding them would draw them as a single
    // smudged line. Legibility wins over straightness there, so relax everything.
    const stillCrowded = pos.some((p, i) => i > 0 && p < pos[i - 1] + gap)
    if (stillCrowded) {
      // Generated straight seats now become movable, but authored reservations
      // remain fixed. Alternating projections let both sides absorb the pressure.
      for (let pass = 0; pass < seats.length; pass++) {
        for (let i = 1; i < pos.length; i++)
          if (!seats[i].immutable && pos[i] < pos[i - 1] + gap)
            pos[i] = Math.min(hi, pos[i - 1] + gap)
        for (let i = pos.length - 2; i >= 0; i--)
          if (!seats[i].immutable && pos[i] > pos[i + 1] - gap)
            pos[i] = Math.max(lo, pos[i + 1] - gap)
      }
    }
    // ratio = (absolute coord − low corner) / axis
    seats.forEach((s, i) =>
      result.set(endKey(s.edgeId, s.end), {
        side,
        ratio: s.immutable
          ? group.find((end) => end.edgeId === s.edgeId && end.end === s.end)!
              .immutableRatio!
          : (clamp(pos[i], lo, hi) - myLo) / axis,
      })
    )
  }
  return result
}
