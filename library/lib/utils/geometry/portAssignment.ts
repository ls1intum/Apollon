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

const rangesOverlap = (
  aLo: number,
  aHi: number,
  bLo: number,
  bHi: number
): boolean => Math.max(aLo, bLo) < Math.min(aHi, bHi)

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
  const overlap = isVerticalSide(side)
    ? rangesOverlap(
        rect.y,
        rect.y + rect.height,
        partner.y,
        partner.y + partner.height
      )
    : rangesOverlap(
        rect.x,
        rect.x + rect.width,
        partner.x,
        partner.x + partner.width
      )
  return overlap ? 0 : 1
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
  if (nU.x === -nV.x && nU.y === -nV.y) {
    const overlap = isVerticalSide(sU)
      ? rangesOverlap(U.y, U.y + U.height, V.y, V.y + V.height)
      : rangesOverlap(U.x, U.x + U.width, V.x, V.x + V.width)
    return overlap ? 0 : 2
  }
  if (nU.x === nV.x && nU.y === nV.y) return 2
  return 1 // perpendicular
}

const lexLess = (a: readonly number[], b: readonly number[]): boolean => {
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return a[i] < b[i]
  return false
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
  edges: readonly SideEdge[]
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
          const key = [
            combinedBends(sU, sV, U, V),
            // Raw-direction alignment DOMINATES: keep an edge on the side its partner
            // actually lies toward (so two same-direction edges bundle). Occupancy only
            // breaks a genuine aim TIE — e.g. a diagonal L reachable two ways equally,
            // where the pair avoiding a side a DIFFERENT-partner edge already took wins.
            -(aimU(sU) + aimV(sV)),
            occOthers(e.sourceNodeId, sU, e.targetNodeId) +
              occOthers(e.targetNodeId, sV, e.sourceNodeId),
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
    } else if (e.sourceBand || e.targetBand) {
      // One band end: pick its side to minimise the best achievable corners over the
      // other (cost-path) end, with the same occupancy + aim tie-break.
      const node = e.sourceBand ? e.sourceNodeId : e.targetNodeId
      const otherNode = e.sourceBand ? e.targetNodeId : e.sourceNodeId
      const aim = e.sourceBand ? aimU : aimV
      let best: Position | null = null
      let bestKey: number[] | null = null
      for (const s of SIDES) {
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

/** How far an anchor is pulled from the side CENTRE toward its own partner (0 =
 * fully centred, 1 = fully aimed). A small bias: centred enough that a merge's
 * anchors stay near the middle (the user's "not so far to the edge"), aimed enough
 * that a same-direction fork's arms separate in target order so the router can nest
 * them. The evidence's "centre unless it costs" — here the cost is a fork crossing. */
const AIM_BIAS = 0.6

/**
 * Seat K ordered ports along a side: start from each port's target-AIMED position
 * pulled `AIM_BIAS` of the way back to the side centre, then enforce a minimum gap
 * between neighbours (so they never coincide or read as one line) and keep the whole
 * band clear of the corners. `orderedAimsPx` are the aimed offsets (px from the low
 * corner) in along-side order; the result is the ratio for each, in the same order.
 *
 * Deterministic and total: a forward min-gap pass then a backward one, both integer-
 * free but order-preserving, so the ports stay in the given order and inside the
 * margins. Aimed-but-centred means a merge stays near the middle while a bundled fork
 * still fans wide enough to nest.
 */
export const packAlongSide = (
  orderedAimsPx: readonly number[],
  axisLength: number,
  minGapPx: number,
  cornerClearancePx: number = CORNER_CLEARANCE_PX
): number[] => {
  const n = orderedAimsPx.length
  if (n === 0) return []
  if (axisLength <= 0) return new Array(n).fill(0.5)
  const margin = Math.min(cornerClearancePx, axisLength * 0.3)
  const lo = margin
  const hi = axisLength - margin
  const centre = axisLength / 2
  // Aim, pulled back toward the centre, clamped inside the margins.
  const pos = orderedAimsPx.map((aim) =>
    clamp(centre + AIM_BIAS * (clamp(aim, lo, hi) - centre), lo, hi)
  )
  // The gap that actually fits (compress when the side is short for K ports).
  const gap = n > 1 ? Math.min(minGapPx, (hi - lo) / (n - 1)) : 0
  // Forward: push each up to at least prev + gap.
  for (let i = 1; i < n; i++)
    if (pos[i] < pos[i - 1] + gap) pos[i] = pos[i - 1] + gap
  // Backward: if the last overran `hi`, pull the tail back down, preserving the gap.
  if (pos[n - 1] > hi) {
    pos[n - 1] = hi
    for (let i = n - 2; i >= 0; i--)
      if (pos[i] > pos[i + 1] - gap) pos[i] = pos[i + 1] - gap
  }
  return pos.map((p) => clamp(p, lo, hi) / axisLength)
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
  /** A FOUR-CENTRE node (activity/BPMN/flowchart-decision/petri) can only attach at
   * the side MIDPOINT, so its port is always ratio 0.5 — the band does not apply and
   * several edges on one such side collapse (the cost side-pass distributes them
   * across sides instead). Freeform nodes (class, component, …) leave this false. */
  fourCenter?: boolean
}

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
  if (overlapHi <= overlapLo) return null // no overlap ⇒ no straight shot
  // Keep the band clear of the corners, but never past the overlap centre: a thin
  // overlap still yields a (single-point) straight lane rather than losing straightness.
  const margin = Math.min(
    CORNER_CLEARANCE_PX,
    Math.min(myAxis, pAxis) * 0.3,
    (overlapHi - overlapLo) / 2
  )
  return { lo: overlapLo + margin, hi: overlapHi - margin, myLo, myAxis }
}

/** K evenly-spaced coordinates in `[lo, hi]`, centred, at most `pitch` apart. */
const spreadCoords = (
  lo: number,
  hi: number,
  count: number,
  pitch: number
): number[] => {
  if (count <= 0) return []
  const centre = (lo + hi) / 2
  if (count === 1) return [centre]
  const gap = Math.min(pitch, (hi - lo) / (count - 1))
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
    }
    const seats: Seat[] = []
    const byPartner = new Map<string, EndRef[]>()
    for (const e of group) {
      const g = byPartner.get(e.partnerNodeId)
      if (g) g.push(e)
      else byPartner.set(e.partnerNodeId, [e])
    }
    for (const [partnerId, members] of byPartner) {
      const band = sharedStraightBand(side, rect, members[0].partnerRect)
      if (band) {
        // Straight lane(s). Multiple SAME-partner siblings nest across the band; a lone
        // straight edge takes its centre. (No corner turn ⇒ no mirror needed.)
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
          })
        )
      } else {
        // L member(s) to this partner. A same-partner perpendicular BUNDLE mirrors its
        // order at the higher-id node so it nests; then each aims at its partner, pulled
        // toward the side centre.
        const sm: SideMember[] = members.map((e) => ({
          edgeId: e.edgeId,
          end: e.end,
          dx: e.partnerCenter.x - centerOf(e.rect).x,
          dy: e.partnerCenter.y - centerOf(e.rect).y,
        }))
        let ordered = orderSideMembers(side, sm)
        if (members.length > 1 && nodeId > partnerId)
          ordered = [...ordered].reverse()
        const byKey = new Map(members.map((e) => [endKey(e.edgeId, e.end), e]))
        const centre = myLo + axis / 2
        const n = ordered.length
        // A LONE L arm on the whole side is CENTRED: its along-side position does not
        // change its corner count, so the tiny length saved by aiming at a far-off
        // partner is not worth the off-centre look (the user's point). Aiming only
        // earns its keep when it SPREADS several edges sharing the side.
        const aimBias = group.length > 1 ? AIM_BIAS : 0
        ordered.forEach((m, i) => {
          const e = byKey.get(endKey(m.edgeId, m.end))!
          const aim = tangentialX ? e.partnerCenter.x : e.partnerCenter.y
          // Same-partner siblings all aim at one point; spread them (in the mirror
          // order) so the corner-turning bundle nests, and so the global sort below
          // keeps that order rather than collapsing them to one coordinate.
          const laneOffset = n > 1 ? (i - (n - 1) / 2) * pitchPx : 0
          const coord =
            centre +
            aimBias *
              (clamp(aim, myLo + margin, myLo + axis - margin) - centre) +
            laneOffset
          seats.push({ edgeId: e.edgeId, end: e.end, coord, fixed: false })
        })
      }
    }

    // One deterministic min-gap pass over all ports on the side, in coordinate order.
    // Fixed (straight) lanes hold their coordinate unless genuinely crowded; the pass
    // only pushes to keep a minimum separation and clears the corners.
    seats.sort((a, b) =>
      a.coord !== b.coord ? a.coord - b.coord : a.edgeId < b.edgeId ? -1 : 1
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
    // ratio = (absolute coord − low corner) / axis
    seats.forEach((s, i) =>
      result.set(endKey(s.edgeId, s.end), {
        side,
        ratio: (clamp(pos[i], lo, hi) - myLo) / axis,
      })
    )
  }
  return result
}

// Re-exported so callers share one clearance source with the router.
export { CORNER_CLEARANCE_PX }
export const _internal = { isVerticalSide, centerOf, EDGES }
