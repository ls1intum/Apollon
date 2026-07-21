import { Position, type Rect, type XYPosition } from "@xyflow/react"
import {
  type FreeformEdgeAnchor,
  getFreeformAnchorFromPoint,
  getFreeformAnchorPoint,
} from "./edgeUtils"

/**
 * How an edge endpoint may attach to a node, decided by the node's visible
 * shape rather than its bounding box. The anchor math below branches on this so
 * a drop, its preview, and the rendered edge all agree.
 *
 * The stored anchor is always `{side, ratio}` on the node's bounding rectangle;
 * the mode only changes how that anchor is turned into a pixel (project onto the
 * oval, snap to a vertex, …) and how a drop is turned into an anchor.
 */
export type ConnectionMode =
  | "freeform-rect" // anywhere on the rectangle border (default box shapes)
  | "ellipse" // on the inscribed oval, at the angle you aimed (use-case)
  | "parallelogram" // anywhere along the sheared outline (flowchart input/output)
  | "four-center" // only the four side points — N/E/S/W (FOUR_WAY-handle nodes)
  | "none" // not a connection target at all (legends, annotations, swimlanes)

// A node's connectable points must match the handles it renders. Nodes that
// render the full handle set stay `freeform-rect` (the default) and connect
// anywhere along their border. Nodes that render only the four side handles
// (FOUR_WAY_HANDLES_PRESET) connect at exactly those four points. The use-case
// oval renders full handles but isn't a rectangle, so it gets `ellipse`. Only
// the exceptions are listed here.
const MODE_OVERRIDES: Record<string, ConnectionMode> = {
  // Not connectable — legends / annotations / partition containers.
  colorDescription: "none",
  titleAndDesctiption: "none",
  bpmnAnnotation: "none",
  activitySwimlane: "none",
  // The one true oval — full handles, so connect anywhere along the curve.
  useCase: "ellipse",
  // Everything below renders only the four side handles, so it connects at
  // exactly those four N/E/S/W points (keep this list in sync with the nodes
  // that pass FOUR_WAY_HANDLES_PRESET).
  activityInitialNode: "four-center",
  activityFinalNode: "four-center",
  activityMergeNode: "four-center",
  bpmnStartEvent: "four-center",
  bpmnIntermediateEvent: "four-center",
  bpmnEndEvent: "four-center",
  bpmnGateway: "four-center",
  flowchartDecision: "four-center",
  petriNetPlace: "four-center",
  petriNetTransition: "four-center",
  componentInterface: "four-center",
  deploymentInterface: "four-center",
  sfcTransitionBranch: "four-center",
  // Continuous along the sheared outline, like the oval is along its curve.
  flowchartInputOutput: "parallelogram",
}

export function getConnectionMode(nodeType?: string): ConnectionMode {
  return (nodeType ? MODE_OVERRIDES[nodeType] : undefined) ?? "freeform-rect"
}

/**
 * Whether a NEW connection dropped on this node should PIN its endpoint to the drop
 * point rather than auto-anchor it. True only for the continuous non-rectangular
 * outlines — the oval and the parallelogram — where the exact drop lands on a visible
 * curve/edge that the live ghost's snap circle marks, so an auto anchor would jump the
 * endpoint to a different place on release (the preview≠commit drift). Plain rectangles
 * and four-point nodes carry no sub-side aim, so they keep the auto default: the solver
 * slides their endpoint for the cleanest route and the user pins later by dragging it.
 */
export function dropAnchorIsAimed(nodeType?: string): boolean {
  const mode = getConnectionMode(nodeType)
  return mode === "ellipse" || mode === "parallelogram"
}

/** Distance from a point to a rectangle (0 when the point is inside it). */
export function distanceToRect(point: XYPosition, rect: Rect): number {
  const dx = Math.max(rect.x - point.x, 0, point.x - (rect.x + rect.width))
  const dy = Math.max(rect.y - point.y, 0, point.y - (rect.y + rect.height))
  return Math.hypot(dx, dy)
}

/**
 * The connection candidate NEAREST `point` (distance to its box, 0 when inside),
 * skipping non-connectable (`mode: "none"`) nodes. On an exact distance tie the
 * later, top-most candidate wins — so a child beats the container it nests in,
 * while a container stays reachable where the pointer is over it but no child is.
 * Shared by the new-connection drop resolver and both edge-endpoint drag hooks.
 */
export function pickNearestConnectable<T>(
  candidates: ReadonlyArray<{ node: T; type?: string; rect: Rect }>,
  point: XYPosition
): { node: T; rect: Rect } | null {
  let best: { node: T; rect: Rect } | null = null
  let bestDistance = Infinity
  for (const candidate of candidates) {
    if (getConnectionMode(candidate.type) === "none") continue
    const distance = distanceToRect(point, candidate.rect)
    if (distance <= bestDistance) {
      bestDistance = distance
      best = { node: candidate.node, rect: candidate.rect }
    }
  }
  return best
}

const centerOf = (rect: Rect): XYPosition => ({
  x: rect.x + rect.width / 2,
  y: rect.y + rect.height / 2,
})

/** Dominant side for a direction from the ellipse centre, so the orthogonal
 * step router still gets a Position to exit on. */
const sideForDirection = (dx: number, dy: number, rx: number, ry: number) => {
  const hx = Math.abs(dx) / (rx || 1)
  const hy = Math.abs(dy) / (ry || 1)
  if (hx >= hy) return dx >= 0 ? Position.Right : Position.Left
  return dy >= 0 ? Position.Bottom : Position.Top
}

/** Project a point onto the inscribed ellipse along the ray from the centre —
 * the endpoint lands on the curve at the angle you aimed. */
const projectOntoEllipse = (
  rect: Rect,
  point: XYPosition
): { point: XYPosition; position: Position } => {
  const c = centerOf(rect)
  const rx = rect.width / 2 || 1
  const ry = rect.height / 2 || 1
  const dx = point.x - c.x
  const dyRaw = point.y - c.y
  // degenerate: a drop exactly at the centre defaults to the top
  const dy = dx === 0 && dyRaw === 0 ? -1 : dyRaw
  const t = 1 / Math.hypot(dx / rx, dy / ry)
  return {
    point: { x: c.x + t * dx, y: c.y + t * dy },
    position: sideForDirection(dx, dy, rx, ry),
  }
}

/** The four side-midpoint connection points of a node, keyed by side. */
function getFourCenterPoints(rect: Rect): Record<Position, XYPosition> {
  const c = centerOf(rect)
  return {
    [Position.Top]: { x: c.x, y: rect.y },
    [Position.Right]: { x: rect.x + rect.width, y: c.y },
    [Position.Bottom]: { x: c.x, y: rect.y + rect.height },
    [Position.Left]: { x: rect.x, y: c.y },
  } as Record<Position, XYPosition>
}

// The flowchart input/output parallelogram slants its left/right edges inward by
// this many px (see FlowchartInputOutput SVG `M20,0 L${width},0 L${width-20},…`).
const FLOWCHART_IO_SLANT = 20

/** Shear a bounding-box border point onto the parallelogram's actual outline so
 * the endpoint sits ON the slanted edge (no gap) at any height. */
const projectOntoParallelogram = (
  rect: Rect,
  anchor: FreeformEdgeAnchor
): { point: XYPosition; position: Position } => {
  const { point, position } = getFreeformAnchorPoint(rect, anchor)
  const o = FLOWCHART_IO_SLANT
  const ty = (point.y - rect.y) / (rect.height || 1) // 0 at top → 1 at bottom
  switch (position) {
    case Position.Left: // slants from x+o (top) to x (bottom)
      return { point: { x: rect.x + o * (1 - ty), y: point.y }, position }
    case Position.Right: // slants from x+w (top) to x+w-o (bottom)
      return {
        point: { x: rect.x + rect.width - o * ty, y: point.y },
        position,
      }
    case Position.Top: // top edge starts o in from the left
      return {
        point: { x: Math.max(point.x, rect.x + o), y: rect.y },
        position,
      }
    case Position.Bottom: // bottom edge ends o short of the right
      return {
        point: {
          x: Math.min(point.x, rect.x + rect.width - o),
          y: rect.y + rect.height,
        },
        position,
      }
    default:
      return { point, position }
  }
}

const nearestSide = (rect: Rect, point: XYPosition): Position => {
  const c = centerOf(rect)
  return sideForDirection(
    point.x - c.x,
    point.y - c.y,
    rect.width / 2,
    rect.height / 2
  )
}

const clampRatio = (r: number) => (r < 0 ? 0 : r > 1 ? 1 : r)

/**
 * The bounding-box border anchor where the ray from the CENTRE through `point`
 * exits the rect. Projecting this onto the ellipse (which also rays from the
 * centre) lands the endpoint at exactly the aimed ANGLE — including diagonals,
 * where routing through the nearest bbox side instead would pull the point
 * ~10° toward a cardinal.
 */
const rectBorderAlongRay = (
  rect: Rect,
  point: XYPosition
): FreeformEdgeAnchor => {
  const c = centerOf(rect)
  const dx = point.x - c.x
  const dy = point.y - c.y
  if (dx === 0 && dy === 0) return { side: Position.Top, ratio: 0.5 }
  const tx = dx !== 0 ? rect.width / 2 / Math.abs(dx) : Infinity
  const ty = dy !== 0 ? rect.height / 2 / Math.abs(dy) : Infinity
  if (tx <= ty) {
    const yEdge = c.y + tx * dy
    return {
      side: dx > 0 ? Position.Right : Position.Left,
      ratio: clampRatio((yEdge - rect.y) / rect.height),
    }
  }
  const xEdge = c.x + ty * dx
  return {
    side: dy > 0 ? Position.Bottom : Position.Top,
    ratio: clampRatio((xEdge - rect.x) / rect.width),
  }
}

/**
 * Shape-aware forward: turn a drop point into the stored `{side, ratio}` anchor.
 * Returns null when the node is not a connection target (`none`).
 */
export function getEdgeAnchorFromPoint(
  nodeType: string | undefined,
  point: XYPosition,
  rect: Rect
): FreeformEdgeAnchor | null {
  switch (getConnectionMode(nodeType)) {
    case "none":
      return null
    case "four-center":
      return { side: nearestSide(rect, point), ratio: 0.5 }
    case "ellipse":
      // Store the anchor ALONG THE RAY to the cursor so the curve projection
      // lands at the aimed angle (no diagonal drift).
      return rectBorderAlongRay(rect, point)
    // parallelogram & freeform-rect store the nearest rect-border anchor; the
    // shape projection at render lands on the slanted outline / border.
    case "parallelogram":
    case "freeform-rect":
    default:
      return getFreeformAnchorFromPoint(point, rect)
  }
}

/**
 * Shape-aware inverse: turn a stored anchor into the rendered pixel + Position,
 * projecting onto the node's real shape. Rect anchors stored on round/diamond/
 * interface nodes convert here on the fly.
 */
export function getEdgeAnchorPoint(
  nodeType: string | undefined,
  rect: Rect,
  anchor: FreeformEdgeAnchor
): { point: XYPosition; position: Position } {
  switch (getConnectionMode(nodeType)) {
    case "four-center": {
      const pts = getFourCenterPoints(rect)
      return { point: pts[anchor.side], position: anchor.side }
    }
    case "ellipse":
      return projectOntoEllipse(
        rect,
        getFreeformAnchorPoint(rect, anchor).point
      )
    case "parallelogram":
      return projectOntoParallelogram(rect, anchor)
    case "none":
    case "freeform-rect":
    default:
      return getFreeformAnchorPoint(rect, anchor)
  }
}
