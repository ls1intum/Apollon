import { Position, type Rect, type XYPosition } from "@xyflow/react"
import {
  type FreeformEdgeAnchor,
  getFreeformAnchorFromPoint,
  getFreeformAnchorPoint,
} from "./edgeUtils"

/**
 * How an edge endpoint may attach to a node, decided by the node's real visible
 * SHAPE (not its bounding box). This is the single source of truth; the anchor
 * math below branches on it so a drop, its preview, and the rendered edge all
 * agree.
 *
 * The stored anchor stays the existing `{side, ratio}` on the node's bounding
 * rectangle — non-breaking, no data migration. The mode only changes how that
 * anchor is turned INTO a pixel (project onto the oval, snap to a vertex, …) and
 * how a drop is turned into an anchor, so existing diagrams simply start
 * rendering their endpoints on the correct shape.
 */
export type ConnectionMode =
  | "freeform-rect" // anywhere on the rectangle border (default box shapes)
  | "ellipse" // on the inscribed oval/circle, at the angle you aimed
  | "four-center" // only the four side midpoints (diamonds, symmetric nodes)
  | "single-point" // the node IS the connector (lollipop interfaces) → its centre
  | "none" // not a connection target at all (legends, annotations, swimlanes)

// Only the exceptions to the `freeform-rect` default are listed. `ellipse`
// covers both ovals (use-case) and circles (events, initial/final, place, …) —
// a circle is just an ellipse with equal radii, and both are "sticky": the
// endpoint stays where you dropped it rather than chasing the other node.
const MODE_OVERRIDES: Record<string, ConnectionMode> = {
  // Not connectable — legends / annotations / partition containers.
  colorDescription: "none",
  titleAndDesctiption: "none",
  activitySwimlane: "none",
  // Ovals & circles → the curve.
  useCase: "ellipse",
  activityInitialNode: "ellipse",
  activityFinalNode: "ellipse",
  bpmnStartEvent: "ellipse",
  bpmnIntermediateEvent: "ellipse",
  bpmnEndEvent: "ellipse",
  petriNetPlace: "ellipse",
  sfcTransitionBranch: "ellipse",
  // Diamonds & symmetric nodes → four vertices/midpoints.
  activityMergeNode: "four-center",
  bpmnGateway: "four-center",
  flowchartDecision: "four-center",
  flowchartInputOutput: "four-center",
  useCaseActor: "four-center",
  // The interface lollipop is a single connector.
  componentInterface: "single-point",
  deploymentInterface: "single-point",
}

export function getConnectionMode(nodeType?: string): ConnectionMode {
  return (nodeType ? MODE_OVERRIDES[nodeType] : undefined) ?? "freeform-rect"
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
  // degenerate: a drop exactly at the centre defaults to the top
  const dy = point.x - c.x === 0 && point.y - c.y === 0 ? -1 : point.y - c.y
  const t = 1 / Math.hypot(dx / rx, dy / ry)
  return {
    point: { x: c.x + t * dx, y: c.y + t * dy },
    position: sideForDirection(dx, dy, rx, ry),
  }
}

/** The four side-midpoint connection points of a node, keyed by side. Default is
 * the bounding-rectangle midpoints; a couple of shapes whose figure is inset
 * from the bbox override this (see notes). */
export function getFourCenterPoints(
  _nodeType: string | undefined,
  rect: Rect
): Record<Position, XYPosition> {
  const c = centerOf(rect)
  return {
    [Position.Top]: { x: c.x, y: rect.y },
    [Position.Right]: { x: rect.x + rect.width, y: c.y },
    [Position.Bottom]: { x: c.x, y: rect.y + rect.height },
    [Position.Left]: { x: rect.x, y: c.y },
  } as Record<Position, XYPosition>
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

/**
 * SHAPE-AWARE forward: turn a drop point into the stored `{side, ratio}` anchor.
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
    case "single-point":
      // Any anchor renders at the centre; keep it stable.
      return { side: Position.Top, ratio: 0.5 }
    case "four-center":
      return { side: nearestSide(rect, point), ratio: 0.5 }
    // ellipse & freeform-rect both store the nearest rect-border anchor; the
    // ellipse projection happens at render, so the round-trip lands on the curve.
    case "ellipse":
    case "freeform-rect":
    default:
      return getFreeformAnchorFromPoint(point, rect)
  }
}

/**
 * SHAPE-AWARE inverse: turn a stored anchor into the rendered pixel + Position,
 * projecting onto the node's real shape. Legacy rect anchors on round/diamond/
 * interface nodes convert here on the fly (no data migration needed).
 */
export function getEdgeAnchorPoint(
  nodeType: string | undefined,
  rect: Rect,
  anchor: FreeformEdgeAnchor
): { point: XYPosition; position: Position } {
  switch (getConnectionMode(nodeType)) {
    case "single-point":
      return { point: centerOf(rect), position: anchor.side }
    case "four-center": {
      const pts = getFourCenterPoints(nodeType, rect)
      return { point: pts[anchor.side], position: anchor.side }
    }
    case "ellipse":
      return projectOntoEllipse(
        rect,
        getFreeformAnchorPoint(rect, anchor).point
      )
    case "none":
    case "freeform-rect":
    default:
      return getFreeformAnchorPoint(rect, anchor)
  }
}
