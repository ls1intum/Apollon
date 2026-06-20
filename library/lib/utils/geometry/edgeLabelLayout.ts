import { IPoint } from "@/edges/Connection"
import { EDGES } from "@/constants"
import { collapseCollinearPoints, getSegmentOrientation } from "./bendHandles"
import { getAxisAlignedSegments } from "@/utils/edgeUtils"

/**
 * Pure geometry for edge-label placement, in flow space. No React, no DOM —
 * every output is derived synchronously from the edge's polyline so it is
 * identical interactively and in headless (resvg) export, and unit-testable on
 * its own (mirrors edges/labelTypes/messageLayout.ts, the #645 gold standard).
 *
 * The model is the cross-tool consensus (yEd / ELK CENTER / mxGraph / JointJS):
 * anchor the label at the MID-SEGMENT midpoint, keep the text horizontal, and
 * offset it by a constant gap onto whichever perpendicular side is clearer.
 * Side selection is a deterministic two-candidate pick — not an optimizer.
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
 * The approximate area a label occupies for a given side, used only for
 * scoring. Spans from the line out to the far edge of the (nominal) text on the
 * chosen side, so a candidate is penalised when that band would sit on a node
 * or on another arm of the edge.
 */
export function candidateBox(
  mid: Pick<MidSegment, "point">,
  side: LabelSide
): Rect {
  const gap = EDGES.LABEL_GAP
  const depth = gap + EDGES.LABEL_LINE_HEIGHT
  const halfExtent = EDGES.LABEL_NOMINAL_HALF_EXTENT
  const { x, y } = mid.point

  switch (side) {
    case "above":
      return {
        x: x - halfExtent,
        y: y - depth,
        width: halfExtent * 2,
        height: depth,
      }
    case "below":
      return { x: x - halfExtent, y, width: halfExtent * 2, height: depth }
    case "left":
      return {
        x: x - depth - halfExtent,
        y: y - EDGES.LABEL_LINE_HEIGHT / 2,
        width: depth + halfExtent,
        height: EDGES.LABEL_LINE_HEIGHT,
      }
    case "right":
      return {
        x,
        y: y - EDGES.LABEL_LINE_HEIGHT / 2,
        width: depth + halfExtent,
        height: EDGES.LABEL_LINE_HEIGHT,
      }
  }
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
    for (const seg of getAxisAlignedSegments(polyline)) {
      const onAcross =
        seg.orientation === "horizontal"
          ? seg.fixed >= box.y && seg.fixed <= box.y + box.height
          : seg.fixed >= box.x && seg.fixed <= box.x + box.width
      const lo = seg.orientation === "horizontal" ? box.x : box.y
      const hi =
        seg.orientation === "horizontal"
          ? box.x + box.width
          : box.y + box.height
      if (onAcross && seg.max >= lo && seg.min <= hi) {
        hits++
        break
      }
    }
  }
  return hits
}

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
  /** Only the midpoint + orientation are needed; callers may pass a full
   * MidSegment or a synthetic {point, isHorizontal}. */
  mid: Pick<MidSegment, "point" | "isHorizontal">
  sourceNodeRect?: Rect
  targetNodeRect?: Rect
  /** Nearby other-edge polylines (see collectNeighborPolylines). Used only to
   * break a tie between two node-clear sides — never overrides node avoidance. */
  neighborGeometry?: IPoint[][]
}

/**
 * Places the relationship/stereotype middle label. Default = centered on top of
 * the mid-segment (above for a horizontal segment, right for a vertical one),
 * flipped to the clearer side when the default would sit on a connected node
 * (the stacked-nodes case, #129) or — as a tie-breaker between two node-clear
 * sides — where fewer other edges cross. Scored lexicographically
 * [nodeHits, neighborHits] so node avoidance always dominates. The constant
 * perpendicular gap already keeps the label off its own line, and the toolbar
 * (transient, far above at y-64) does not collide with an on-top label, so
 * neither is a factor. All inputs are always-present geometry, so the side is
 * stable across selection and identical in headless export.
 */
export function computeMiddleLabelLayout(input: MiddleLabelInput): PlacedLabel {
  const { mid, neighborGeometry } = input
  const nodeRects = [input.sourceNodeRect, input.targetNodeRect].filter(
    (rect): rect is Rect => rect !== undefined
  )

  // First candidate is the preferred "on top" side; a tie keeps it.
  const sides: LabelSide[] = mid.isHorizontal
    ? ["above", "below"]
    : ["right", "left"]

  let best: LabelSide = sides[0]
  let bestScore: [number, number] | null = null
  for (const side of sides) {
    const box = candidateBox(mid, side)
    const score: [number, number] = [
      countNodeHits(box, nodeRects),
      neighborGeometry ? countNeighborHits(box, neighborGeometry) : 0,
    ]
    if (
      bestScore === null ||
      score[0] < bestScore[0] ||
      (score[0] === bestScore[0] && score[1] < bestScore[1])
    ) {
      bestScore = score
      best = side
    }
  }

  return placeOnSide(mid, best)
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
