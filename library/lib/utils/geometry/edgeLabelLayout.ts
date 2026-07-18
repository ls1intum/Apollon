import { IPoint } from "@/edges/Connection"
import { EDGES } from "@/constants"
import { clamp, lexLess } from "@/utils/geometry/scalar"
import { collapseCollinearPoints, getSegmentOrientation } from "./bendHandles"
import { getAxisAlignedSegments } from "@/utils/edgeUtils"

/**
 * Pure geometry for edge-label placement, in flow space. No React, no DOM —
 * every output is derived synchronously from the edge's polyline so it is
 * identical interactively and in headless (resvg) export, and unit-testable on
 * its own (mirrors edges/labelTypes/messageLayout.ts, the #645 gold standard).
 *
 * The model follows the cross-tool consensus (yEd / ELK CENTER / mxGraph /
 * JointJS): keep the text horizontal and offset it by a constant gap onto a
 * perpendicular side. The label is hosted on whichever ARM of the (possibly
 * stepped) edge has room — scored against the edge's own arms, nodes, and
 * neighbour edges — defaulting to centered-on-top of the arc-mid segment when
 * that is already clear. Deterministic scoring, not a continuous optimizer.
 */

export interface Rect {
  x: number
  y: number
  width: number
  height: number
}

export interface MidSegment {
  /** Rounded midpoint of the chosen mid-segment (flow space). */
  point: IPoint
  /** Orientation of the chosen mid-segment. */
  isHorizontal: boolean
  /** Index of the chosen segment in the collapsed polyline. */
  segmentIndex: number
  /** The chosen segment's endpoints in source->target order. Useful to derive
   * the LOCAL flow direction at the middle (e.g. communication arrows) instead
   * of the raw node anchors, which can disagree on a bent edge. */
  start: IPoint
  end: IPoint
}

export type LabelSide = "above" | "below" | "left" | "right"

export interface PlacedLabel {
  x: number
  y: number
  textAnchor: "start" | "middle" | "end"
  dominantBaseline: "auto" | "middle" | "hanging"
  /** Exposed for unit assertions; not needed for rendering. */
  side: LabelSide
}

const round = (value: number): number => Math.round(value)

/**
 * The mid-SEGMENT midpoint and orientation, computed purely from the polyline.
 *
 * Walks the collapsed polyline accumulating Manhattan segment length (exact
 * because EDGES.STEP_BORDER_RADIUS === 0, so getSmoothStepPath emits no corner
 * arcs and the rendered path equals the polyline). The "middle" is the first
 * segment whose cumulative length reaches half the total; the midpoint is lerped
 * strictly INSIDE that one segment, so it is corner-safe — unlike sampling the
 * rendered path with getPointAtLength(total/2), which can land on a bend or, if
 * line-jump bridges are present, on a bridge arc off the straight line.
 */
export function getMidSegment(
  renderPoints: IPoint[],
  fallbackSource: IPoint,
  fallbackTarget: IPoint
): MidSegment {
  const points = collapseCollinearPoints(renderPoints)

  if (points.length < 2) {
    const dx = fallbackTarget.x - fallbackSource.x
    const dy = fallbackTarget.y - fallbackSource.y
    return {
      point: {
        x: round((fallbackSource.x + fallbackTarget.x) / 2),
        y: round((fallbackSource.y + fallbackTarget.y) / 2),
      },
      isHorizontal: Math.abs(dx) >= Math.abs(dy),
      segmentIndex: 0,
      start: fallbackSource,
      end: fallbackTarget,
    }
  }

  const lengths: number[] = []
  let total = 0
  for (let i = 0; i < points.length - 1; i++) {
    const length =
      Math.abs(points[i + 1].x - points[i].x) +
      Math.abs(points[i + 1].y - points[i].y)
    lengths.push(length)
    total += length
  }

  // Degenerate path (all vertices coincide): anchor on the first point.
  if (total === 0) {
    return {
      point: { x: round(points[0].x), y: round(points[0].y) },
      isHorizontal: getSegmentOrientation(points, 0) === "H",
      segmentIndex: 0,
      start: points[0],
      end: points[points.length - 1],
    }
  }

  const half = total / 2
  let running = 0
  let index = lengths.length - 1
  for (let i = 0; i < lengths.length; i++) {
    // ">=" so an exact-midpoint-on-a-corner case picks the segment that ends at
    // the corner rather than the corner vertex — orientation stays well-defined.
    if (running + lengths[i] >= half) {
      index = i
      break
    }
    running += lengths[i]
  }

  const t = (half - running) / lengths[index]
  const start = points[index]
  const end = points[index + 1]

  return {
    point: {
      x: round(start.x + (end.x - start.x) * t),
      y: round(start.y + (end.y - start.y) * t),
    },
    isHorizontal: getSegmentOrientation(points, index) === "H",
    segmentIndex: index,
    start,
    end,
  }
}

const rectsIntersect = (a: Rect, b: Rect): boolean =>
  a.x < b.x + b.width &&
  a.x + a.width > b.x &&
  a.y < b.y + b.height &&
  a.y + a.height > b.y

/**
 * Rough single-line text width (flow px). Deterministic — a pure character-count
 * estimate, never canvas measurement — so the chosen placement is identical
 * interactively and in headless export, and SSR-safe. Slightly generous so the
 * scoring box errs toward MORE clearance.
 */
export function estimateLabelWidth(text: string, fontSize: number): number {
  return text.length * fontSize * 0.6
}

/**
 * The text box (flow space) for a label anchored at `point` on the chosen side,
 * sized to the actual label (`w` × `h`). Used to score overlap against the
 * edge's own arms, neighbour edges, and nodes.
 */
export function candidateBox(
  point: IPoint,
  side: LabelSide,
  w: number,
  h: number
): Rect {
  const gap = EDGES.LABEL_GAP
  switch (side) {
    case "above":
      return { x: point.x - w / 2, y: point.y - gap - h, width: w, height: h }
    case "below":
      return { x: point.x - w / 2, y: point.y + gap, width: w, height: h }
    case "left":
      return { x: point.x - gap - w, y: point.y - h / 2, width: w, height: h }
    case "right":
      return { x: point.x + gap, y: point.y - h / 2, width: w, height: h }
  }
}

/** Whether an axis-aligned polyline segment passes through the box. */
const segmentCrossesBox = (
  seg: {
    orientation: "horizontal" | "vertical"
    fixed: number
    min: number
    max: number
  },
  box: Rect
): boolean => {
  const onAcross =
    seg.orientation === "horizontal"
      ? seg.fixed >= box.y && seg.fixed <= box.y + box.height
      : seg.fixed >= box.x && seg.fixed <= box.x + box.width
  const lo = seg.orientation === "horizontal" ? box.x : box.y
  const hi =
    seg.orientation === "horizontal" ? box.x + box.width : box.y + box.height
  return onAcross && seg.max >= lo && seg.min <= hi
}

const placeOnSide = (
  mid: Pick<MidSegment, "point">,
  side: LabelSide
): PlacedLabel => {
  const gap = EDGES.LABEL_GAP
  const { x, y } = mid.point
  switch (side) {
    case "above":
      return {
        x,
        y: y - gap,
        textAnchor: "middle",
        dominantBaseline: "auto",
        side,
      }
    case "below":
      return {
        x,
        y: y + gap,
        textAnchor: "middle",
        dominantBaseline: "hanging",
        side,
      }
    case "left":
      return {
        x: x - gap,
        y,
        textAnchor: "end",
        dominantBaseline: "middle",
        side,
      }
    case "right":
      return {
        x: x + gap,
        y,
        textAnchor: "start",
        dominantBaseline: "middle",
        side,
      }
  }
}

const countNodeHits = (box: Rect, nodeRects: Rect[]): number =>
  nodeRects.reduce(
    (hits, rect) => (rectsIntersect(box, rect) ? hits + 1 : hits),
    0
  )

/** How many of the given (neighbour-edge) polylines pass through the box —
 * counting each polyline at most once. */
const countNeighborHits = (box: Rect, polylines: IPoint[][]): number => {
  let hits = 0
  for (const polyline of polylines) {
    if (
      getAxisAlignedSegments(polyline).some((seg) =>
        segmentCrossesBox(seg, box)
      )
    )
      hits++
  }
  return hits
}

/** How many of the edge's OWN arms (every segment except the host) cross the
 * box — i.e. the label would sit on another part of the same edge. */
const countOwnSegmentHits = (
  box: Rect,
  segments: ReturnType<typeof getAxisAlignedSegments>,
  hostIndex: number
): number =>
  segments.reduce(
    (hits, seg) =>
      seg.index !== hostIndex && segmentCrossesBox(seg, box) ? hits + 1 : hits,
    0
  )

const bounds = (polyline: IPoint[]): Rect => {
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const point of polyline) {
    if (point.x < minX) minX = point.x
    if (point.x > maxX) maxX = point.x
    if (point.y < minY) minY = point.y
    if (point.y > maxY) maxY = point.y
  }
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY }
}

/**
 * The other edges' polylines whose bounding box comes within `radius` of
 * `center`, excluding `selfId`. Bounds the neighbour scan to edges actually near
 * the label so placement stays O(nearby), not O(all edges) per label.
 */
export function collectNeighborPolylines(
  geometryById: Record<string, IPoint[]>,
  selfId: string,
  center: IPoint,
  radius: number
): IPoint[][] {
  const query: Rect = {
    x: center.x - radius,
    y: center.y - radius,
    width: radius * 2,
    height: radius * 2,
  }
  const result: IPoint[][] = []
  for (const [id, polyline] of Object.entries(geometryById)) {
    if (id === selfId || polyline.length < 2) continue
    if (rectsIntersect(query, bounds(polyline))) result.push(polyline)
  }
  return result
}

export interface MiddleLabelInput {
  /** The edge's full rendered polyline (source → target). */
  renderPoints: IPoint[]
  /** The label text — used for a width fallback when measuredWidth is absent. */
  labelText: string
  /** Render font size (px) of the label. */
  fontSize: number
  /** Real measured label width (px), from the rendering context. Preferred over
   * the character-count estimate so the scored box equals the rendered ink. */
  measuredWidth?: number
  /** Node rects to avoid — NOT only source/target: every node the edge routes
   * near, so the label never lands on an unrelated node's body. */
  nodeRects?: Rect[]
  /** Nearby other-edge polylines (see collectNeighborPolylines), collected over
   * the WHOLE edge so they cover any arm the label may land on. */
  neighborGeometry?: IPoint[][]
}

/** Clearance (flow px) kept between the label box and any line or node, so a
 * label that merely sits NEXT TO a parallel arm still counts as overlapping. */
const LABEL_CLEARANCE = 5
/** Cap on along-arm sample points per arm, to bound candidate count. */
const MAX_ARM_SAMPLES = 20

const distance = (a: IPoint, b: IPoint): number =>
  Math.hypot(a.x - b.x, a.y - b.y)

const inflate = (r: Rect, m: number): Rect => ({
  x: r.x - m,
  y: r.y - m,
  width: r.width + 2 * m,
  height: r.height + 2 * m,
})

/** Lexicographic "<" over equal-length numeric cost tuples. */
/**
 * Places the relationship/stereotype middle label so it overlaps nothing it can
 * avoid. The label is hosted on whichever arm of the edge — and on whichever
 * perpendicular side — has room: each candidate (every segment × its two sides)
 * is scored lexicographically by
 *   [ overlaps (own other arms + nodes + neighbour edges),
 *     does-not-fit-within-the-segment,
 *     distance from the arc-midpoint (keep it central),
 *     side preference (on top / right) ].
 * For a simple edge the arc-mid segment wins with zero overlaps, so the label
 * stays centered on top exactly as before; on a zig-zag/stepped edge it moves to
 * a longer arm with clearance instead of crossing the short mid-segment's
 * neighbouring arms. All inputs are static geometry, so the placement is stable
 * across selection and identical in headless export.
 */
export function computeMiddleLabelLayout(input: MiddleLabelInput): PlacedLabel {
  const { renderPoints, labelText, fontSize, neighborGeometry } = input
  const nodeRects = input.nodeRects ?? []
  const neighbors = neighborGeometry ?? []
  const points = collapseCollinearPoints(renderPoints)
  const arc = getMidSegment(
    points,
    points[0] ?? { x: 0, y: 0 },
    points[points.length - 1] ?? { x: 0, y: 0 }
  ).point

  const w = input.measuredWidth ?? estimateLabelWidth(labelText, fontSize)
  const h = EDGES.LABEL_LINE_HEIGHT
  const segments = getAxisAlignedSegments(points)
  if (segments.length === 0) {
    return placeOnSide({ point: arc }, "above")
  }

  let best: { point: IPoint; side: LabelSide } | null = null
  let bestCost: number[] | null = null

  for (const seg of segments) {
    const isHorizontal = seg.orientation === "horizontal"
    // The label's extent ALONG the arm (its width on a horizontal arm; its line
    // height on a vertical one). It "fits" only if it stays between the bends.
    const along = isHorizontal ? w : h
    const lo = seg.min + along / 2
    const hi = seg.max - along / 2
    const target = isHorizontal ? arc.x : arc.y

    // Slide along the arm: sample positions (capped) plus the arc-mid-nearest
    // point and both fit extremes, so a partly-blocked arm can still offer a
    // clear window instead of being taken/rejected at a single point.
    const coords = new Set<number>()
    if (lo <= hi) {
      coords.add(clamp(target, lo, hi))
      coords.add(lo)
      coords.add(hi)
      const span = hi - lo
      const step = Math.max(
        EDGES.LABEL_LINE_HEIGHT,
        along / 2,
        span / MAX_ARM_SAMPLES
      )
      for (let c = lo; c <= hi; c += step) coords.add(c)
    } else {
      coords.add((seg.min + seg.max) / 2) // arm too short — label will overhang
    }
    const fits = lo <= hi

    const sides: LabelSide[] = isHorizontal
      ? ["above", "below"]
      : ["right", "left"]
    for (const coord of coords) {
      const anchor: IPoint = isHorizontal
        ? { x: coord, y: seg.fixed }
        : { x: seg.fixed, y: coord }
      for (const side of sides) {
        // Pad the box by the clearance so a label merely sitting NEXT TO a line
        // or node (not strictly crossing it) is still penalised.
        const box = inflate(candidateBox(anchor, side, w, h), LABEL_CLEARANCE)
        // Cost, most-significant first: sitting on a NODE (covers its content)
        // is worse than touching a thin line (own arm or neighbour edge); then
        // prefer a label that fits within its arm, then a central spot, then the
        // on-top side. The lex-min picks the clearest, most central placement
        // and degrades to the least-bad when nothing is fully clear.
        const cost: [number, number, number, number, number] = [
          countNodeHits(box, nodeRects),
          countOwnSegmentHits(box, segments, seg.index) +
            countNeighborHits(box, neighbors),
          fits ? 0 : 1,
          Math.round(distance(anchor, arc)),
          side === sides[0] ? 0 : 1,
        ]
        if (bestCost === null || lexLess(cost, bestCost)) {
          bestCost = cost
          best = { point: anchor, side }
        }
      }
    }
  }

  return placeOnSide({ point: best!.point }, best!.side)
}

export interface RotatedLabelPlacement {
  x: number
  y: number
  /** Degrees; the label is rotated to lie along the connector, flipped to stay
   * upright. */
  rotation: number
}

/**
 * Placement for a label that lies ALONG a straight (possibly diagonal)
 * connector — use-case association names and the <<include>>/<<extend>>
 * stereotype. The text is rotated to the line's slope (flipped to stay upright)
 * and pushed `perpendicularOffset` px off the line on the upper-left normal.
 * Pass 0 to center it on the line (e.g. include/extend, which sits in the gap
 * carved by calculateStraightPath). Centralises the rotation math that was
 * duplicated across the use-case label components.
 */
export function computeUseCaseLabelLayout(
  source: IPoint,
  target: IPoint,
  perpendicularOffset: number
): RotatedLabelPlacement {
  const dx = target.x - source.x
  const dy = target.y - source.y
  const angle = Math.atan2(dy, dx) * (180 / Math.PI)
  const rotation = angle > 90 || angle < -90 ? angle + 180 : angle

  const midX = (source.x + target.x) / 2
  const midY = (source.y + target.y) / 2
  const length = Math.sqrt(dx * dx + dy * dy)
  if (length === 0 || perpendicularOffset === 0) {
    return { x: midX, y: midY, rotation }
  }

  return {
    x: midX + (-dy / length) * perpendicularOffset,
    y: midY + (dx / length) * perpendicularOffset,
    rotation,
  }
}
