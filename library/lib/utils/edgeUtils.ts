import { CANVAS, EDGES, INTERFACE } from "@/utils/geometry/routingConstants"
import { IPoint, pointsToSvgPath } from "@/edges/Connection"
import { DiagramEdgeType, UMLDiagramType } from "@/typings"
import type { ObstacleRect } from "@/utils/geometry/obstacles"
import { clamp } from "@/utils/geometry/scalar"
import {
  routeAroundObstacles,
  routeConflictsWithNeighborEdges,
  routeRunsTooCloseToBody,
} from "@/utils/geometry/orthogonalRouter"
import {
  Position,
  ConnectionLineType,
  getSmoothStepPath,
  type Rect,
  type XYPosition,
} from "@xyflow/system"

export const adjustTargetCoordinates = (
  targetX: number,
  targetY: number,
  targetPosition: Position,
  markerPadding: number
): { targetX: number; targetY: number } => {
  if (targetPosition === "left") {
    targetX -= markerPadding
  } else if (targetPosition === "right") {
    targetX += markerPadding
  } else if (targetPosition === "top") {
    targetY -= markerPadding
  } else if (targetPosition === "bottom") {
    targetY += markerPadding
  }
  return { targetX, targetY }
}

export const adjustSourceCoordinates = (
  sourceX: number,
  sourceY: number,
  sourcePosition: Position,
  sourcePadding: number
): { sourceX: number; sourceY: number } => {
  if (sourcePosition === "left") {
    sourceX += sourcePadding
  } else if (sourcePosition === "right") {
    sourceX -= sourcePadding
  } else if (sourcePosition === "top") {
    sourceY += sourcePadding
  } else if (sourcePosition === "bottom") {
    sourceY -= sourcePadding
  }
  return { sourceX, sourceY }
}

/**
 * Round a shape-projected connection point without moving it back inside its
 * node. Fractional text measurements make this distinction observable at the
 * right and bottom boundaries.
 */
export const roundAnchorPointOutward = (
  point: XYPosition,
  position: Position
): XYPosition => ({
  x:
    position === Position.Left
      ? Math.floor(point.x)
      : position === Position.Right
        ? Math.ceil(point.x)
        : Math.round(point.x),
  y:
    position === Position.Top
      ? Math.floor(point.y)
      : position === Position.Bottom
        ? Math.ceil(point.y)
        : Math.round(point.y),
})

export const calculateDynamicEdgeLabels = (
  x: number,
  y: number,
  direction: string
) => {
  const offset = 10
  const textOffset = 15

  switch (direction) {
    case "top": {
      const topYOffset = -5
      return {
        roleX: x - offset,
        roleY: y + topYOffset,
        roleTextAnchor: "end" as const,
        multiplicityX: x + offset,
        multiplicityY: y + topYOffset,
        multiplicityTextAnchor: "start" as const,
      }
    }
    case "bottom": {
      const bottomYOffset = textOffset
      return {
        roleX: x - offset,
        roleY: y + bottomYOffset,
        roleTextAnchor: "end" as const,
        multiplicityX: x + offset,
        multiplicityY: y + bottomYOffset,
        multiplicityTextAnchor: "start" as const,
      }
    }
    case "left": {
      const leftXOffset = -5
      return {
        roleX: x + leftXOffset,
        roleY: y - offset,
        roleTextAnchor: "end" as const,
        multiplicityX: x + leftXOffset,
        multiplicityY: y + 20,
        multiplicityTextAnchor: "end" as const,
      }
    }
    case "right": {
      return {
        roleX: x + 5,
        roleY: y - offset,
        roleTextAnchor: "start" as const,
        multiplicityX: x + 5,
        multiplicityY: y + 20,
        multiplicityTextAnchor: "start" as const,
      }
    }
    default: {
      return {
        roleX: x,
        roleY: y - offset,
        roleTextAnchor: "middle" as const,
        multiplicityX: x,
        multiplicityY: y + offset,
        multiplicityTextAnchor: "middle" as const,
      }
    }
  }
}

export interface EdgeMarkerStyles {
  markerEnd?: string
  markerStart?: string
  markerPadding?: number
  strokeDashArray?: string
  offset?: number
}

export function getEdgeMarkerStyles(edgeType: string): EdgeMarkerStyles {
  switch (edgeType) {
    case "ClassBidirectional":
    case "DeploymentAssociation":
    case "ObjectLink":
    case "SyntaxTreeLink":
    case "CommunicationLink":
      return {
        markerPadding: EDGES.MARKER_PADDING,
        strokeDashArray: "0",
        offset: 0,
      }
    case "ActivityControlFlow":
    case "ClassUnidirectional":
    case "FlowChartFlowline":
    case "ReachabilityGraphArc":
      return {
        markerPadding: EDGES.MARKER_PADDING,
        markerEnd: "url(#black-arrow)",
        strokeDashArray: "0",
        offset: 0,
      }
    case "ClassAggregation":
      return {
        markerPadding: EDGES.MARKER_PADDING,
        markerEnd: "url(#white-rhombus)",
        strokeDashArray: "0",
        offset: 0,
      }
    case "ClassComposition":
      return {
        markerPadding: EDGES.MARKER_PADDING,
        markerEnd: "url(#black-rhombus)",
        strokeDashArray: "0",
        offset: 0,
      }
    case "ClassInheritance":
      return {
        markerPadding: EDGES.MARKER_PADDING,
        markerEnd: "url(#white-triangle)",
        strokeDashArray: "0",
        offset: 0,
      }
    case "PetriNetArc":
      return {
        markerPadding: EDGES.MARKER_PADDING,
        markerEnd: "url(#black-triangle)",
        strokeDashArray: "0",
        offset: 0,
      }
    case "ComponentDependency":
    case "ClassDependency":
    case "DeploymentDependency":
      return {
        markerPadding: EDGES.MARKER_PADDING,
        markerEnd: "url(#black-arrow)",
        strokeDashArray: "10",
        offset: 0,
      }
    case "ClassRealization":
      return {
        markerPadding: EDGES.MARKER_PADDING,
        markerEnd: "url(#white-triangle)",
        strokeDashArray: "10",
        offset: 0,
      }
    case "BPMNSequenceFlow":
      return {
        markerPadding: EDGES.MARKER_PADDING,
        markerEnd: "url(#bpmn-black-triangle)",
        strokeDashArray: "0",
        offset: 8,
      }
    case "BPMNMessageFlow":
      return {
        markerPadding: EDGES.MARKER_PADDING,
        markerEnd: "url(#bpmn-white-triangle)",
        markerStart: "url(#bpmn-white-circle)",
        strokeDashArray: "10",
        offset: 8,
      }
    case "BPMNAssociationFlow":
      return {
        markerPadding: EDGES.MARKER_PADDING,
        strokeDashArray: "10",
        offset: 0,
      }
    case "BPMNDataAssociationFlow":
      return {
        markerPadding: EDGES.MARKER_PADDING,
        markerEnd: "url(#bpmn-arrow)",
        strokeDashArray: "10",
        offset: 8,
      }
    case "UseCaseAssociation":
      return {
        markerPadding: EDGES.MARKER_PADDING,
        strokeDashArray: "0",
        offset: 0,
      }
    case "UseCaseInclude":
      return {
        markerPadding: EDGES.MARKER_PADDING,
        markerEnd: "url(#black-arrow)",
        strokeDashArray: "10",
        offset: 0,
      }
    case "UseCaseExtend":
      return {
        markerPadding: EDGES.MARKER_PADDING,
        markerEnd: "url(#black-arrow)",
        strokeDashArray: "10",
        offset: 0,
      }
    case "UseCaseGeneralization":
      return {
        markerPadding: EDGES.MARKER_PADDING,
        markerEnd: "url(#white-triangle)",
        strokeDashArray: "0",
        offset: 0,
      }

    case "ComponentProvidedInterface":
    case "DeploymentProvidedInterface":
      return {
        markerPadding: EDGES.MARKER_PADDING,
        strokeDashArray: "0", // Plain line like association
        offset: 0,
      }
    case "ComponentRequiredInterface":
    case "DeploymentRequiredInterface":
      return {
        // markerPadding = MARKER_PADDING + gap
        // MARKER_PADDING (-3) compensates for React Flow handle offset
        // gap is the spacing between socket arc and ball circle
        markerPadding: EDGES.MARKER_PADDING + INTERFACE.SOCKET_GAP,
        markerEnd: "url(#required-interface)",
        strokeDashArray: "0",
        offset: 0,
      }
    case "ComponentRequiredQuarterInterface":
    case "DeploymentRequiredQuarterInterface":
      return {
        markerPadding: EDGES.MARKER_PADDING + INTERFACE.SOCKET_GAP,
        markerEnd: "url(#required-interface-quarter)",
        strokeDashArray: "0",
        offset: 0,
      }
    case "ComponentRequiredThreeQuarterInterface":
    case "DeploymentRequiredThreeQuarterInterface":
      return {
        markerPadding: EDGES.MARKER_PADDING + INTERFACE.SOCKET_GAP,
        markerEnd: "url(#required-interface-threequarter)",
        strokeDashArray: "0",
        offset: 0,
      }
    default:
      return {
        markerPadding: EDGES.MARKER_PADDING,
        strokeDashArray: "0",
        offset: 0,
      }
  }
}

function distance(p1: XYPosition, p2: XYPosition): number {
  return Math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2)
}

interface FindClosestHandleParams {
  point: XYPosition
  rect: Rect
  useFourHandles?: boolean
}

type RectHandlePoint = {
  label: string
  position: XYPosition
  side: Position
}

export type FreeformEdgeAnchor = {
  side: Position
  /**
   * Offset along the side, normalized to the current node side length. The
   * editor rounds the resolved point to whole flow pixels, so a drop can land
   * on any pixel while still scaling sensibly if the node is resized later.
   */
  ratio: number
}

const sideToHandleId: Record<Position, "top" | "right" | "bottom" | "left"> = {
  top: "top",
  right: "right",
  bottom: "bottom",
  left: "left",
}

// Match the canvas grid step. Handle offsets snap to this so the X (or Y)
// distance between any two handles on equally-sized nodes is always a
// multiple of the grid step — which means a user dragging a node on the grid
// can always close the misalignment exactly. With a smaller step (e.g. half
// the grid), some handle pairs end up an odd-grid-half off and never line up.
//
// Hard-coded to avoid a known circular import:
//   constants.ts → @/nodes → nodes/.../Class.tsx → @/utils (barrel) → edgeUtils.ts → @/constants
// Reading CANVAS.SNAP_TO_GRID_PX at module init can resolve to undefined when
// edgeUtils.ts evaluates before constants.ts finishes. Keep this in sync
// with CANVAS.SNAP_TO_GRID_PX in constants.ts (currently 5).
const HANDLE_SNAP_STEP_PX = 5
const HANDLE_RATIO_START = 0.2
const HANDLE_RATIO_END = 0.8

export function isFreeformEdgeAnchor(
  anchor: unknown
): anchor is FreeformEdgeAnchor {
  if (!anchor || typeof anchor !== "object") return false

  const candidate = anchor as Partial<FreeformEdgeAnchor>
  return (
    (candidate.side === "top" ||
      candidate.side === "right" ||
      candidate.side === "bottom" ||
      candidate.side === "left") &&
    typeof candidate.ratio === "number" &&
    Number.isFinite(candidate.ratio)
  )
}

export function getSideHandleIdForPosition(
  position: Position
): "top" | "right" | "bottom" | "left" {
  return sideToHandleId[position]
}

export function getFreeformAnchorFromPoint(
  point: XYPosition,
  rect: Rect
): FreeformEdgeAnchor {
  const right = rect.x + rect.width
  const bottom = rect.y + rect.height

  // Resolve the EXTERIOR of the node explicitly, so a dragging cursor never flip-flops:
  // nearest-side ties at the corner LINES (a point level with the top edge but past the
  // right one is equidistant to both), and those tie-bands sit between regions that pick
  // the other side, so a small move jumps top<->right. Instead:
  //   • past ONE edge  -> THAT side, always (ratio from the in-range coordinate).
  //   • past BOTH edges (a real corner) -> the side you overshot MORE past (the angle you
  //     aimed): mostly sideways -> vertical (L/R) side, mostly up/down -> horizontal (T/B).
  // Every exterior region is now a single side with one clean boundary between neighbours.
  const pastX = point.x < rect.x ? -1 : point.x > right ? 1 : 0
  const pastY = point.y < rect.y ? -1 : point.y > bottom ? 1 : 0
  const ratioAlong = (offset: number, length: number) =>
    length > 0 ? clamp(Math.round(offset), 0, length) / length : 0.5

  if (pastX !== 0 && pastY !== 0) {
    const overshootX = pastX > 0 ? point.x - right : rect.x - point.x
    const overshootY = pastY > 0 ? point.y - bottom : rect.y - point.y
    return overshootX >= overshootY
      ? {
          side: (pastX > 0 ? "right" : "left") as Position,
          ratio: pastY > 0 ? 1 : 0,
        }
      : {
          side: (pastY > 0 ? "bottom" : "top") as Position,
          ratio: pastX > 0 ? 1 : 0,
        }
  }
  if (pastX !== 0) {
    return {
      side: (pastX > 0 ? "right" : "left") as Position,
      ratio: ratioAlong(point.y - rect.y, rect.height),
    }
  }
  if (pastY !== 0) {
    return {
      side: (pastY > 0 ? "bottom" : "top") as Position,
      ratio: ratioAlong(point.x - rect.x, rect.width),
    }
  }

  // Interior drop (cursor inside the node): fall back to the nearest border.
  const x = clamp(point.x, rect.x, right)
  const y = clamp(point.y, rect.y, bottom)
  const candidates: Array<{
    side: Position
    point: XYPosition
    axisLength: number
    offset: number
  }> = [
    {
      side: "top" as Position,
      point: { x, y: rect.y },
      axisLength: rect.width,
      offset: x - rect.x,
    },
    {
      side: "right" as Position,
      point: { x: right, y },
      axisLength: rect.height,
      offset: y - rect.y,
    },
    {
      side: "bottom" as Position,
      point: { x, y: bottom },
      axisLength: rect.width,
      offset: x - rect.x,
    },
    {
      side: "left" as Position,
      point: { x: rect.x, y },
      axisLength: rect.height,
      offset: y - rect.y,
    },
  ]

  let closest = candidates[0]
  let minDistance = distance(point, closest.point)

  for (const candidate of candidates.slice(1)) {
    const candidateDistance = distance(point, candidate.point)
    if (candidateDistance < minDistance) {
      closest = candidate
      minDistance = candidateDistance
    }
  }

  const roundedOffset = clamp(Math.round(closest.offset), 0, closest.axisLength)

  return {
    side: closest.side,
    ratio: closest.axisLength > 0 ? roundedOffset / closest.axisLength : 0.5,
  }
}

export function getFreeformAnchorPoint(
  rect: Rect,
  anchor: FreeformEdgeAnchor
): { point: XYPosition; position: Position } {
  const ratio = clamp(anchor.ratio, 0, 1)

  switch (anchor.side) {
    case Position.Top: {
      const offset = Math.round(rect.width * ratio)
      return {
        point: { x: rect.x + offset, y: rect.y },
        position: Position.Top,
      }
    }
    case Position.Right: {
      const offset = Math.round(rect.height * ratio)
      return {
        point: { x: rect.x + rect.width, y: rect.y + offset },
        position: Position.Right,
      }
    }
    case Position.Bottom: {
      const offset = Math.round(rect.width * ratio)
      return {
        point: { x: rect.x + offset, y: rect.y + rect.height },
        position: Position.Bottom,
      }
    }
    case Position.Left: {
      const offset = Math.round(rect.height * ratio)
      return {
        point: { x: rect.x, y: rect.y + offset },
        position: Position.Left,
      }
    }
    default: {
      const unhandled: never = anchor.side
      throw new Error(`getFreeformAnchorPoint: unhandled side ${unhandled}`)
    }
  }
}

// Visible half-circle arc-dragger length along the side it sits on. Two
// adjacent visible arcs must have centers separated by at least this much
// to avoid overlapping each other.
const ARC_LENGTH_PX = 28

const snapToGridStep = (value: number, axisLength: number): number => {
  const snapped = Math.round(value / HANDLE_SNAP_STEP_PX) * HANDLE_SNAP_STEP_PX
  return clamp(snapped, 0, axisLength)
}

// Per-side handle-placement plan. Each side carries nine grid-aligned offsets
// indexed 0..8 (left-to-right or top-to-bottom). The five named handle IDs
// per side map to the even indices (0, 2, 4, 6, 8) so existing edge data
// stays addressable; the four "between" IDs sit at the odd indices and only
// matter when the side is wide enough to render the five-arc layout.
//
// `visibleArcCount` decides which subset of the nine slots renders a visible
// half-circle dragger:
//   5 → arcs at indices 0, 2, 4, 6, 8 (every other slot).
//   3 → arcs at indices 0, 4, 8 (corners + middle, classic layout).
//   1 → arc at index 4 only (centre).
export type AxisHandlePlan = {
  offsets: [
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
  ]
  visibleArcCount: 1 | 3 | 5
}

const EMPTY_PLAN: AxisHandlePlan = {
  offsets: [0, 0, 0, 0, 0, 0, 0, 0, 0],
  visibleArcCount: 1,
}

// Build a 9-slot offset tuple from a list of grid-aligned visible-arc
// positions. The visible arcs are placed at even slot indices; the four
// odd-indexed slots collapse to the midpoint of their two visible
// neighbours (snapped to the grid) when the side is in a stage that doesn't
// expose them, so every legacy handle ID still resolves to a usable point.
const buildOffsets = (visible: number[]): AxisHandlePlan["offsets"] => {
  if (visible.length === 5) {
    const [v0, v2, v4, v6, v8] = visible
    return [
      v0,
      snapToGridStep((v0 + v2) / 2, Number.POSITIVE_INFINITY),
      v2,
      snapToGridStep((v2 + v4) / 2, Number.POSITIVE_INFINITY),
      v4,
      snapToGridStep((v4 + v6) / 2, Number.POSITIVE_INFINITY),
      v6,
      snapToGridStep((v6 + v8) / 2, Number.POSITIVE_INFINITY),
      v8,
    ]
  }
  if (visible.length === 3) {
    // Three visible arcs (corners + middle). The four hidden in-between
    // slots collapse to the nearest visible neighbour so saved edges using
    // any of the legacy IDs (top-mid-left, top-mid-right, …) resolve to a
    // grid-aligned anchor that sits on the arc closest to them.
    const [v0, v4, v8] = visible
    const v2 = snapToGridStep((v0 + v4) / 2, Number.POSITIVE_INFINITY)
    const v6 = snapToGridStep((v4 + v8) / 2, Number.POSITIVE_INFINITY)
    return [v0, v0, v2, v4, v4, v4, v6, v8, v8]
  }
  // Single visible arc at the middle; every other slot collapses to it.
  const [v4] = visible
  return [v4, v4, v4, v4, v4, v4, v4, v4, v4]
}

// Stage-1 placement (three-arc layout). An arithmetic-progression search
// inside the cosmetic [HANDLE_RATIO_START, HANDLE_RATIO_END] band places the
// corner arcs. Returns the three visible arc positions, or null if the side is
// too short for the band-based search to be meaningful.
const findStage1Offsets = (axisLength: number): number[] | null => {
  if (axisLength <= 0) return null

  const ideal = [0, 1, 2, 3, 4].map(
    (index) =>
      axisLength *
      (HANDLE_RATIO_START +
        ((HANDLE_RATIO_END - HANDLE_RATIO_START) * index) / 4)
  )

  const maxGridUnit = Math.floor(axisLength / HANDLE_SNAP_STEP_PX)
  if (maxGridUnit < 4) return null

  let bestOffsets: number[] | null = null
  let bestScore = Number.POSITIVE_INFINITY
  for (
    let stepUnits = 1;
    stepUnits <= Math.floor(maxGridUnit / 4);
    stepUnits++
  ) {
    const maxStartUnit = maxGridUnit - 4 * stepUnits
    for (let startUnit = 0; startUnit <= maxStartUnit; startUnit++) {
      const offsets = [0, 1, 2, 3, 4].map(
        (index) => (startUnit + index * stepUnits) * HANDLE_SNAP_STEP_PX
      )
      let score = 0
      for (let i = 0; i < offsets.length; i++) {
        const delta = offsets[i] - ideal[i]
        score += delta * delta
      }
      score -= stepUnits * 1e-3
      if (score < bestScore) {
        bestScore = score
        bestOffsets = offsets
      }
    }
  }

  if (!bestOffsets) return null
  // Expose the band's slot 0, slot 2 and slot 4 as visible arcs; the inner
  // slots 1 and 3 are not used as arcs in this stage.
  return [bestOffsets[0], bestOffsets[2], bestOffsets[4]]
}

// Stage-2 placement (five-arc layout). Evenly distributes five arcs across
// the [HANDLE_RATIO_START, HANDLE_RATIO_END] band, snapping each to the
// grid. Returns the five visible-arc positions or null when grid-snapping
// would cause two adjacent arcs to share the same coordinate.
const findStage2Offsets = (axisLength: number): number[] | null => {
  if (axisLength <= 0) return null

  const positions = [0, 1, 2, 3, 4].map((index) => {
    const ratio =
      HANDLE_RATIO_START + ((HANDLE_RATIO_END - HANDLE_RATIO_START) * index) / 4
    return snapToGridStep(axisLength * ratio, axisLength)
  })

  for (let i = 1; i < positions.length; i++) {
    if (positions[i] <= positions[i - 1]) return null
  }
  return positions
}

// Pick the largest staged layout that fits the side without overlapping
// arcs:
//   * stage 2 — five arcs, requires adjacent arcs ≥ ARC_LENGTH_PX apart in
//               the band-based layout.
//   * stage 1 — three arcs at the band positions; arcs sit at slots 0, 4, 8
//               of the nine-slot model.
//   * stage 0 — single arc at the centre.
const solveAxisPlan = (axisLength: number): AxisHandlePlan => {
  if (!Number.isFinite(axisLength) || axisLength <= 0) return EMPTY_PLAN

  const stage2 = findStage2Offsets(axisLength)
  if (stage2) {
    let allFit = true
    for (let i = 1; i < stage2.length; i++) {
      if (stage2[i] - stage2[i - 1] < ARC_LENGTH_PX) {
        allFit = false
        break
      }
    }
    if (allFit) {
      return {
        offsets: buildOffsets(stage2),
        visibleArcCount: 5,
      }
    }
  }

  const stage1 = findStage1Offsets(axisLength)
  if (stage1 && stage1[1] - stage1[0] >= ARC_LENGTH_PX) {
    return {
      offsets: buildOffsets(stage1),
      visibleArcCount: 3,
    }
  }

  const center = snapToGridStep(axisLength / 2, axisLength)
  return {
    offsets: buildOffsets([center]),
    visibleArcCount: 1,
  }
}

export function getAxisHandlePlan(axisLength: number): AxisHandlePlan {
  return solveAxisPlan(axisLength)
}

/**
 * Reduce how many arcs a side actually shows so adjacent visible arcs never
 * overlap ON SCREEN. The slot offsets stay fixed (handles don't move); we just
 * hide arcs when, at the current zoom, two neighbours would be closer than an
 * arc's on-screen length apart. Arcs counter-scale to a constant on-screen size
 * when zoomed out and grow when zoomed in, so the required flow spacing is
 * ARC_LENGTH_PX / min(zoom, 1): bigger (fewer arcs) when zoomed out, constant
 * at and above 1x.
 *
 * Returns 5, 3, or 1 — always <= the size-based `baseVisibleArcCount`.
 */
export function reduceVisibleArcCountForZoom(
  offsets: AxisHandlePlan["offsets"],
  baseVisibleArcCount: 1 | 3 | 5,
  zoom: number
): 1 | 3 | 5 {
  const safeZoom = Number.isFinite(zoom) && zoom > 0 ? zoom : 1
  const requiredFlowSpacing = ARC_LENGTH_PX / Math.min(safeZoom, 1)

  if (baseVisibleArcCount >= 5) {
    const minAdjacent = Math.min(
      offsets[2] - offsets[0],
      offsets[4] - offsets[2],
      offsets[6] - offsets[4],
      offsets[8] - offsets[6]
    )
    if (minAdjacent >= requiredFlowSpacing) return 5
  }
  if (baseVisibleArcCount >= 3) {
    const minAdjacent = Math.min(
      offsets[4] - offsets[0],
      offsets[8] - offsets[4]
    )
    if (minAdjacent >= requiredFlowSpacing) return 3
  }
  return 1
}

export function getDistributedHandleOffsets(axisLength: number): number[] {
  return [...solveAxisPlan(axisLength).offsets]
}

export function getDistributedHandleOffsetPercents(
  axisLength: number
): [string, string, string, string, string, string, string, string, string] {
  if (!Number.isFinite(axisLength) || axisLength <= 0) {
    return ["0%", "0%", "0%", "0%", "0%", "0%", "0%", "0%", "0%"]
  }

  const offsets = solveAxisPlan(axisLength).offsets
  return offsets.map((offset) => `${(offset / axisLength) * 100}%`) as [
    string,
    string,
    string,
    string,
    string,
    string,
    string,
    string,
    string,
  ]
}

function getCanonicalHandlePoints(
  rect: Rect,
  useFourHandles: boolean
): RectHandlePoint[] {
  // Nine slot positions per axis. Even indices map to the five named handle
  // IDs per side (corner / mid-corner / middle / mid-corner / corner); odd
  // indices map to the "between" IDs that only render arcs in the five-arc
  // stage but are always addressable as hidden connection points.
  const xs = getDistributedHandleOffsets(rect.width).map(
    (offset) => rect.x + offset
  )
  const ys = getDistributedHandleOffsets(rect.height).map(
    (offset) => rect.y + offset
  )
  const [
    xStart,
    xBetween1,
    xMidStart,
    xBetween3,
    xMiddle,
    xBetween5,
    xMidEnd,
    xBetween7,
    xEnd,
  ] = xs
  const [
    yStart,
    yBetween1,
    yMidStart,
    yBetween3,
    yMiddle,
    yBetween5,
    yMidEnd,
    yBetween7,
    yEnd,
  ] = ys

  const points: RectHandlePoint[] = [
    { label: "top", position: { x: xMiddle, y: yStart }, side: Position.Top },
    {
      label: "bottom",
      position: { x: xMiddle, y: yEnd },
      side: Position.Bottom,
    },
    { label: "left", position: { x: xStart, y: yMiddle }, side: Position.Left },
    {
      label: "right",
      position: { x: xEnd, y: yMiddle },
      side: Position.Right,
    },
  ]

  if (!useFourHandles) {
    points.push(
      // Top side. The two corners (top-left, top-right) belong to this side;
      // aliases left-top and right-top resolve to them via canonical lookup.
      {
        label: "top-left",
        position: { x: xStart, y: yStart },
        side: Position.Top,
      },
      {
        label: "top-between-left-mid-left",
        position: { x: xBetween1, y: yStart },
        side: Position.Top,
      },
      {
        label: "top-mid-left",
        position: { x: xMidStart, y: yStart },
        side: Position.Top,
      },
      {
        label: "top-between-mid-left-center",
        position: { x: xBetween3, y: yStart },
        side: Position.Top,
      },
      {
        label: "top-between-center-mid-right",
        position: { x: xBetween5, y: yStart },
        side: Position.Top,
      },
      {
        label: "top-mid-right",
        position: { x: xMidEnd, y: yStart },
        side: Position.Top,
      },
      {
        label: "top-between-mid-right-right",
        position: { x: xBetween7, y: yStart },
        side: Position.Top,
      },
      {
        label: "top-right",
        position: { x: xEnd, y: yStart },
        side: Position.Top,
      },
      // Right side — inner slots only; the corners are owned by the top
      // and bottom sides above/below.
      {
        label: "right-between-top-mid-top",
        position: { x: xEnd, y: yBetween1 },
        side: Position.Right,
      },
      {
        label: "right-mid-top",
        position: { x: xEnd, y: yMidStart },
        side: Position.Right,
      },
      {
        label: "right-between-mid-top-center",
        position: { x: xEnd, y: yBetween3 },
        side: Position.Right,
      },
      {
        label: "right-between-center-mid-bottom",
        position: { x: xEnd, y: yBetween5 },
        side: Position.Right,
      },
      {
        label: "right-mid-bottom",
        position: { x: xEnd, y: yMidEnd },
        side: Position.Right,
      },
      {
        label: "right-between-mid-bottom-bottom",
        position: { x: xEnd, y: yBetween7 },
        side: Position.Right,
      },
      // Bottom side, right → left.
      {
        label: "bottom-right",
        position: { x: xEnd, y: yEnd },
        side: Position.Bottom,
      },
      {
        label: "bottom-between-right-mid-right",
        position: { x: xBetween7, y: yEnd },
        side: Position.Bottom,
      },
      {
        label: "bottom-mid-right",
        position: { x: xMidEnd, y: yEnd },
        side: Position.Bottom,
      },
      {
        label: "bottom-between-mid-right-center",
        position: { x: xBetween5, y: yEnd },
        side: Position.Bottom,
      },
      {
        label: "bottom-between-center-mid-left",
        position: { x: xBetween3, y: yEnd },
        side: Position.Bottom,
      },
      {
        label: "bottom-mid-left",
        position: { x: xMidStart, y: yEnd },
        side: Position.Bottom,
      },
      {
        label: "bottom-between-mid-left-left",
        position: { x: xBetween1, y: yEnd },
        side: Position.Bottom,
      },
      {
        label: "bottom-left",
        position: { x: xStart, y: yEnd },
        side: Position.Bottom,
      },
      // Left side — inner slots only.
      {
        label: "left-between-bottom-mid-bottom",
        position: { x: xStart, y: yBetween7 },
        side: Position.Left,
      },
      {
        label: "left-mid-bottom",
        position: { x: xStart, y: yMidEnd },
        side: Position.Left,
      },
      {
        label: "left-between-mid-bottom-center",
        position: { x: xStart, y: yBetween5 },
        side: Position.Left,
      },
      {
        label: "left-between-center-mid-top",
        position: { x: xStart, y: yBetween3 },
        side: Position.Left,
      },
      {
        label: "left-mid-top",
        position: { x: xStart, y: yMidStart },
        side: Position.Left,
      },
      {
        label: "left-between-mid-top-top",
        position: { x: xStart, y: yBetween1 },
        side: Position.Left,
      }
    )
  }

  return points
}

export function findClosestHandle({
  point,
  rect,
  useFourHandles = false,
}: FindClosestHandleParams): string {
  // Only ever snap to a NAMED handle. The "*-between-*" slots are hidden,
  // resolution-only anchors: they never render a visible arc, and custom nodes
  // (e.g. the UseCase ellipse) render only the named IDs. Selecting a between
  // slot on a drop/reconnect could persist a handle the target node does not
  // render, and React Flow would drop the edge with a missing-handle error.
  const points = getCanonicalHandlePoints(rect, useFourHandles).filter(
    (candidate) => !candidate.label.includes("-between-")
  )

  // Tie-break is deterministic: when two candidates have equal distance,
  // the first candidate in the canonical declaration order above wins.
  let closest = points[0]
  let minDist = distance(point, points[0].position)

  for (const p of points) {
    const d = distance(point, p.position)
    if (d < minDist) {
      minDist = d
      closest = p
    }
  }

  return closest.label
}

export function getEllipseHandlePosition(
  centerX: number,
  centerY: number,
  radiusX: number,
  radiusY: number,
  handle: string
): { x: number; y: number } {
  const angleMap: { [key: string]: number } = {
    right: 0,
    "right-mid-bottom": Math.PI / 10, // 18°
    "right-bottom": Math.PI / 5, // 36°
    "bottom-right": (3 * Math.PI) / 10, // 54°
    "bottom-mid-right": (2 * Math.PI) / 5, // 72°
    bottom: Math.PI / 2, // 90°
    "bottom-mid-left": (3 * Math.PI) / 5, // 108°
    "bottom-left": (7 * Math.PI) / 10, // 126°
    "left-bottom": (4 * Math.PI) / 5, // 144°
    "left-mid-bottom": (9 * Math.PI) / 10, // 162°
    left: Math.PI, // 180°
    "left-mid-top": (11 * Math.PI) / 10, // 198°
    "left-top": (6 * Math.PI) / 5, // 216°
    "top-left": (13 * Math.PI) / 10, // 234°
    "top-mid-left": (7 * Math.PI) / 5, // 252°
    top: (3 * Math.PI) / 2, // 270°
    "top-mid-right": (8 * Math.PI) / 5, // 288°
    "top-right": (17 * Math.PI) / 10, // 306°
    "right-top": (9 * Math.PI) / 5, // 324°
    "right-mid-top": (19 * Math.PI) / 10, // 342°
  }

  const angle = angleMap[handle] ?? 0

  return {
    x: centerX + radiusX * Math.cos(angle),
    y: centerY + radiusY * Math.sin(angle),
  }
}

export type Orientation = "horizontal" | "vertical"

export type AxisAlignedSegment = {
  index: number
  start: IPoint
  end: IPoint
  orientation: Orientation
  fixed: number
  min: number
  max: number
}

export function getAxisAlignedSegments(
  points: IPoint[],
  tolerance: number = 1
): AxisAlignedSegment[] {
  const segments: AxisAlignedSegment[] = []
  for (let i = 0; i < points.length - 1; i += 1) {
    const start = points[i]
    const end = points[i + 1]
    const isVertical = Math.abs(start.x - end.x) <= tolerance
    const isHorizontal = Math.abs(start.y - end.y) <= tolerance

    if (!isVertical && !isHorizontal) continue

    if (isVertical) {
      const min = Math.min(start.y, end.y)
      const max = Math.max(start.y, end.y)
      segments.push({
        index: i,
        start,
        end,
        orientation: "vertical",
        fixed: start.x,
        min,
        max,
      })
    } else {
      const min = Math.min(start.x, end.x)
      const max = Math.max(start.x, end.x)
      segments.push({
        index: i,
        start,
        end,
        orientation: "horizontal",
        fixed: start.y,
        min,
        max,
      })
    }
  }

  return segments
}

export type LineJumpHit = {
  segmentIndex: number
  point: IPoint
  orientation: Orientation
}

export function findLineJumpIntersections(
  baseSegments: AxisAlignedSegment[],
  otherSegments: AxisAlignedSegment[],
  jumpWidth: number,
  preferredOrientation: Orientation | "any" = "horizontal",
  tolerance: number = 1
): LineJumpHit[] {
  // `margin` keeps a hop off the base segment's own corners — the arc spans
  // ±jumpWidth/2, so a crossing nearer than that to a bend would overrun it.
  const margin = jumpWidth / 2 + 2
  const hits: LineJumpHit[] = []

  for (const base of baseSegments) {
    if (
      preferredOrientation !== "any" &&
      base.orientation !== preferredOrientation
    ) {
      continue
    }

    for (const other of otherSegments) {
      if (base.orientation === other.orientation) continue

      if (
        base.orientation === "horizontal" &&
        other.orientation === "vertical"
      ) {
        const x = other.fixed
        const y = base.fixed
        if (
          x < base.min + margin ||
          x > base.max - margin ||
          // The crossed segment must pass THROUGH the base line, not merely
          // touch it: a crossing at the other segment's endpoint is a
          // T-junction/corner where the lines meet, not cross — bridging it
          // would falsely signal "no connection". Require a strict interior
          // crossing (inset by `tolerance`).
          y < other.min + tolerance ||
          y > other.max - tolerance
        ) {
          continue
        }

        hits.push({
          segmentIndex: base.index,
          point: { x, y },
          orientation: base.orientation,
        })
      }

      if (
        base.orientation === "vertical" &&
        other.orientation === "horizontal"
      ) {
        const x = base.fixed
        const y = other.fixed
        if (
          y < base.min + margin ||
          y > base.max - margin ||
          // Strict interior crossing on the other segment — see above.
          x < other.min + tolerance ||
          x > other.max - tolerance
        ) {
          continue
        }

        hits.push({
          segmentIndex: base.index,
          point: { x, y },
          orientation: base.orientation,
        })
      }
    }
  }

  return hits
}

export function buildPathWithLineJumps(
  points: IPoint[],
  jumps: LineJumpHit[],
  jumpHeight: number,
  jumpWidth: number = EDGES.EDGE_LINE_JUMP_WIDTH
): string {
  if (points.length === 0) return ""
  if (jumps.length === 0) return pointsToSvgPath(points)

  const round = (num: number) => Math.round(num)
  // Match pointsToSvgPath's space-separated "M x y" format so a step edge's `d`
  // keeps the same shape whether or not it carries bridges — consumers and e2e
  // tests parse the source point with a "M x y" regex.
  const fmt = (point: IPoint) => `${round(point.x)} ${round(point.y)}`
  const jumpsBySegment = new Map<number, LineJumpHit[]>()

  for (const jump of jumps) {
    const list = jumpsBySegment.get(jump.segmentIndex) ?? []
    list.push(jump)
    jumpsBySegment.set(jump.segmentIndex, list)
  }

  const pathParts = [`M ${fmt(points[0])}`]

  for (let i = 0; i < points.length - 1; i += 1) {
    const start = points[i]
    const end = points[i + 1]
    const isHorizontal = Math.abs(start.y - end.y) < 1
    const segmentLength = isHorizontal
      ? Math.abs(end.x - start.x)
      : Math.abs(end.y - start.y)

    const segmentJumps = jumpsBySegment.get(i)
    if (!segmentJumps || segmentJumps.length === 0) {
      pathParts.push(`L ${fmt(end)}`)
      continue
    }

    if (segmentLength < jumpWidth * 1.2) {
      pathParts.push(`L ${fmt(end)}`)
      continue
    }

    const coordKey = (jump: LineJumpHit) =>
      isHorizontal ? jump.point.x : jump.point.y
    const direction = isHorizontal
      ? Math.sign(end.x - start.x) || 1
      : Math.sign(end.y - start.y) || 1
    const sortedJumps = [...segmentJumps].sort((a, b) =>
      direction >= 0 ? coordKey(a) - coordKey(b) : coordKey(b) - coordKey(a)
    )
    const margin = jumpWidth / 2 + 2
    let lastCoord = direction >= 0 ? -Infinity : Infinity

    for (const jump of sortedJumps) {
      const coord = coordKey(jump)
      const min = isHorizontal
        ? Math.min(start.x, end.x)
        : Math.min(start.y, end.y)
      const max = isHorizontal
        ? Math.max(start.x, end.x)
        : Math.max(start.y, end.y)

      if (coord < min + margin || coord > max - margin) {
        continue
      }
      if (
        (direction >= 0 && coord - lastCoord < jumpWidth) ||
        (direction < 0 && lastCoord - coord < jumpWidth)
      ) {
        continue
      }

      const halfJump = Math.min(jumpWidth / 2, segmentLength / 2 - 2)
      if (halfJump <= 1) continue

      const startCoord = direction >= 0 ? -halfJump : halfJump
      const endCoord = direction >= 0 ? halfJump : -halfJump
      const jumpStart = isHorizontal
        ? { x: coord + startCoord, y: start.y }
        : { x: start.x, y: coord + startCoord }
      const jumpEnd = isHorizontal
        ? { x: coord + endCoord, y: start.y }
        : { x: start.x, y: coord + endCoord }
      const control = isHorizontal
        ? { x: coord, y: start.y - Math.abs(jumpHeight) }
        : { x: start.x + Math.abs(jumpHeight), y: coord }

      pathParts.push(`L ${fmt(jumpStart)}`, `Q ${fmt(control)} ${fmt(jumpEnd)}`)

      lastCoord = coord
    }

    pathParts.push(`L ${fmt(end)}`)
  }

  return pathParts.join(" ")
}

/**
 * Collects the crossings an edge should bridge over. Uses the layout-stable
 * "horizontal hops vertical" convention (yEd / yFiles' `BridgeManager` default
 * `HORIZONTAL_BRIDGES_VERTICAL`): the bridge is always drawn on the HORIZONTAL
 * segment of a crossing. Consequences that make this the right default for a
 * declarative editor:
 *  - exactly one edge of any H×V pair hops (the horizontal one),
 *  - the assignment is independent of edge array order / z-index, so it never
 *    flips when an edge is selected (React Flow's `elevateEdgesOnSelect`) or
 *    reordered — unlike a render-order rule.
 * Diagonal segments yield no axis-aligned segments, so they neither hop nor are
 * hopped (line jumps are orthogonal-only).
 *
 * @param geometryMap each OTHER edge's actual rendered polyline, keyed by id
 *   (from the edge-geometry registry)
 */
export function computeLineJumpsForEdge(
  edgeId: string,
  basePoints: IPoint[],
  edges: ReadonlyArray<{ id: string }>,
  geometryMap: ReadonlyMap<string, IPoint[]>
): LineJumpHit[] {
  const baseSegments = getAxisAlignedSegments(basePoints)
  if (baseSegments.length === 0) return []

  const hits: LineJumpHit[] = []
  for (const other of edges) {
    if (other.id === edgeId) continue
    const otherPoints = geometryMap.get(other.id)
    if (!otherPoints || otherPoints.length < 2) continue
    hits.push(
      ...findLineJumpIntersections(
        baseSegments,
        getAxisAlignedSegments(otherPoints),
        EDGES.EDGE_LINE_JUMP_WIDTH,
        "horizontal"
      )
    )
  }
  return hits
}

export function calculateOverlayPath(
  sourceX: number,
  sourceY: number,
  targetX: number,
  targetY: number,
  type: string
): string {
  // Round coordinates to whole pixels for pixel-perfect rendering
  const sX = Math.round(sourceX)
  const sY = Math.round(sourceY)
  const tX = Math.round(targetX)
  const tY = Math.round(targetY)

  if (
    type == "UseCaseInclude" ||
    type == "UseCaseExtend" ||
    type == "UseCaseGeneralization" ||
    type == "CommunicationLink" ||
    type == "PetriNetArc"
  ) {
    const { offset } = getEdgeMarkerStyles(type)
    const markerOffset = offset ?? 0

    if (markerOffset !== 0) {
      const dx = tX - sX
      const dy = tY - sY
      const length = Math.sqrt(dx * dx + dy * dy)

      if (length > 0) {
        const normalizedDx = dx / length
        const normalizedDy = dy / length
        const adjustedTargetX = Math.round(tX + normalizedDx * markerOffset)
        const adjustedTargetY = Math.round(tY + normalizedDy * markerOffset)

        return `M ${sX},${sY} L ${adjustedTargetX},${adjustedTargetY}`
      }
    }
  }
  return `M ${sX},${sY} L ${tX},${tY}`
}

export function calculateStraightPath(
  sourceX: number,
  sourceY: number,
  targetX: number,
  targetY: number,
  type: string
): string {
  // Round coordinates to whole pixels for pixel-perfect rendering
  const sX = Math.round(sourceX)
  const sY = Math.round(sourceY)
  const tX = Math.round(targetX)
  const tY = Math.round(targetY)

  const dx = tX - sX
  const dy = tY - sY
  const length = Math.sqrt(dx * dx + dy * dy)

  if (length === 0) {
    return `M ${sX},${sY} L ${tX},${tY}`
  }

  if (type === "UseCaseInclude" || type == "UseCaseExtend") {
    const midX = Math.round((sX + tX) / 2)
    const midY = Math.round((sY + tY) / 2)

    const normalizedDx = dx / length
    const normalizedDy = dy / length
    const gapSize = 40

    const gapStartX = Math.round(midX - normalizedDx * gapSize)
    const gapStartY = Math.round(midY - normalizedDy * gapSize)
    const gapEndX = Math.round(midX + normalizedDx * gapSize)
    const gapEndY = Math.round(midY + normalizedDy * gapSize)

    return `M ${sX},${sY} L ${gapStartX},${gapStartY} M ${gapEndX},${gapEndY} L ${tX},${tY}`
  }

  // For all other edge types, just create a straight line
  return `M ${sX},${sY} L ${tX},${tY}`
}

export function simplifySvgPath(path: string): string {
  // Round to whole pixels for pixel-perfect rendering
  const round = (num: number) => Math.round(num)

  const withSpaces = path.replace(/([MLQ])(?=[-0-9])/gi, "$1 ")
  const cleaned = withSpaces.replace(/,/g, " ").trim()
  const tokens = cleaned.split(/\s+/)
  const outputTokens: string[] = []
  let i = 0

  while (i < tokens.length) {
    const token = tokens[i].toUpperCase()
    if (token === "M" || token === "L") {
      const x = parseFloat(tokens[i + 1])
      const y = parseFloat(tokens[i + 2])
      if (!isNaN(x) && !isNaN(y)) {
        outputTokens.push(token, round(x).toString(), round(y).toString())
      }
      i += 3
    } else if (token === "Q") {
      const cx = parseFloat(tokens[i + 1])
      const cy = parseFloat(tokens[i + 2])
      const ex = parseFloat(tokens[i + 3])
      const ey = parseFloat(tokens[i + 4])
      if (cx === ex && cy === ey) {
        outputTokens.push("L", round(ex).toString(), round(ey).toString())
      } else {
        outputTokens.push(
          "Q",
          round(cx).toString(),
          round(cy).toString(),
          round(ex).toString(),
          round(ey).toString()
        )
      }
      i += 5
    } else {
      const x = parseFloat(tokens[i])
      const y = parseFloat(tokens[i + 1])
      if (!isNaN(x) && !isNaN(y)) {
        outputTokens.push(round(x).toString(), round(y).toString())
      }
      i += 2
    }
  }

  return outputTokens.join(" ")
}

export function simplifyPoints(points: IPoint[]): IPoint[] {
  if (points.length < 3) return points
  const result: IPoint[] = [points[0]]

  for (let i = 1; i < points.length - 1; i++) {
    const prev = result[result.length - 1]
    const curr = points[i]
    const next = points[i + 1]
    if (prev.x === curr.x && curr.x === next.x) {
      continue
    }
    if (prev.y === curr.y && curr.y === next.y) {
      continue
    }
    result.push(curr)
  }
  result.push(points[points.length - 1])
  return result
}

export function parseSvgPath(path: string): IPoint[] {
  const tokens = simplifySvgPath(path).replace(/,/g, " ").trim().split(/\s+/)
  const points: IPoint[] = []
  let i = 0
  while (i < tokens.length) {
    const token = tokens[i]
    if (token === "M" || token === "L") {
      const x = parseFloat(tokens[i + 1])
      const y = parseFloat(tokens[i + 2])
      if (!isNaN(x) && !isNaN(y)) {
        points.push({ x, y })
      }
      i += 3
    } else {
      const x = parseFloat(tokens[i])
      const y = parseFloat(tokens[i + 1])
      if (!isNaN(x) && !isNaN(y)) {
        points.push({ x, y })
      }
      i += 2
    }
  }
  return simplifyPoints(points)
}

export function removeDuplicatePoints(points: IPoint[]): IPoint[] {
  if (points.length === 0) return points
  const filtered: IPoint[] = [points[0]]
  for (let i = 1; i < points.length; i++) {
    const prev = filtered[filtered.length - 1]
    const current = points[i]
    if (current.x !== prev.x || current.y !== prev.y) {
      filtered.push(current)
    }
  }
  return filtered
}

export function resolveReconnectPreviewBasePoints(
  storedPoints: IPoint[] | undefined,
  localPoints: IPoint[] | undefined,
  fallbackPoints: IPoint[]
): IPoint[] {
  const previewBasePoints =
    storedPoints && storedPoints.length > 0
      ? storedPoints
      : localPoints && localPoints.length > 0
        ? localPoints
        : fallbackPoints

  return previewBasePoints.map((point) => ({ ...point }))
}

type SegmentAxis = "horizontal" | "vertical"

const getSegmentAxisForPosition = (position: Position): SegmentAxis => {
  switch (position) {
    case Position.Left:
    case Position.Right:
      return "horizontal"
    case Position.Top:
    case Position.Bottom:
      return "vertical"
    default:
      return "vertical"
  }
}

const getAlternatingAxis = (
  firstAxis: SegmentAxis,
  segmentIndex: number
): SegmentAxis =>
  segmentIndex % 2 === 0
    ? firstAxis
    : firstAxis === "horizontal"
      ? "vertical"
      : "horizontal"

const canConnectWithSingleSegment = (
  sourcePoint: IPoint,
  targetPoint: IPoint,
  axis: SegmentAxis
): boolean =>
  axis === "horizontal"
    ? sourcePoint.y === targetPoint.y
    : sourcePoint.x === targetPoint.x

function getMinimumOrthogonalSegmentCount(
  sourcePoint: IPoint,
  targetPoint: IPoint,
  sourceAxis: SegmentAxis,
  targetAxis: SegmentAxis
): number {
  if (sourceAxis !== targetAxis) return 2
  return canConnectWithSingleSegment(sourcePoint, targetPoint, sourceAxis)
    ? 1
    : 3
}

const getLaneValue = (
  points: IPoint[],
  index: number,
  axis: SegmentAxis,
  fallbackPoint: IPoint
): number => {
  const point = points[Math.min(index, points.length - 1)] ?? fallbackPoint
  return axis === "horizontal" ? point.x : point.y
}

const buildOrthogonalPathFromLanes = (
  laneValues: number[],
  segmentCount: number,
  sourcePoint: IPoint,
  targetPoint: IPoint,
  sourceAxis: SegmentAxis,
  targetAxis: SegmentAxis
): IPoint[] => {
  const result: IPoint[] = [{ ...sourcePoint }]

  for (let i = 1; i < segmentCount; i++) {
    const previousPoint = result[result.length - 1]
    const axis = getAlternatingAxis(sourceAxis, i - 1)

    result.push(
      axis === "horizontal"
        ? { x: laneValues[i], y: previousPoint.y }
        : { x: previousPoint.x, y: laneValues[i] }
    )
  }

  // For segmentCount === 1 the "penultimate" point is the source itself.
  // We still align it to the target axis before appending targetPoint; any
  // degenerate duplicate is collapsed by removeDuplicatePoints below.
  const penultimatePoint = result[result.length - 1]
  if (penultimatePoint) {
    if (targetAxis === "horizontal") {
      penultimatePoint.y = targetPoint.y
    } else {
      penultimatePoint.x = targetPoint.x
    }
  }

  result.push({ ...targetPoint })
  return removeDuplicatePoints(result)
}

const isSourceLaneCompatible = (
  position: Position,
  sourcePoint: IPoint,
  laneValue: number
): boolean => {
  switch (position) {
    case Position.Left:
      // Strict inequality avoids zero-length first segments that would
      // collapse user geometry when a lane equals the endpoint coordinate.
      return laneValue < sourcePoint.x
    case Position.Right:
      return laneValue > sourcePoint.x
    case Position.Top:
      return laneValue < sourcePoint.y
    case Position.Bottom:
      return laneValue > sourcePoint.y
    default:
      return false
  }
}

const isTargetApproachCompatible = (
  position: Position,
  penultimatePoint: IPoint,
  targetPoint: IPoint
): boolean => {
  switch (position) {
    case Position.Left:
      // Strict inequality keeps a real approach segment into the target side.
      return penultimatePoint.x < targetPoint.x
    case Position.Right:
      return penultimatePoint.x > targetPoint.x
    case Position.Top:
      return penultimatePoint.y < targetPoint.y
    case Position.Bottom:
      return penultimatePoint.y > targetPoint.y
    default:
      return false
  }
}

const getStubExitCoord = (
  position: Position,
  point: IPoint,
  stubLength: number
): number => {
  switch (position) {
    case Position.Right:
      return point.x + stubLength
    case Position.Left:
      return point.x - stubLength
    case Position.Bottom:
      return point.y + stubLength
    case Position.Top:
    default:
      return point.y - stubLength
  }
}

const getStubExitPoint = (
  position: Position,
  point: IPoint,
  stubLength: number
): IPoint => {
  switch (position) {
    case Position.Right:
      return { x: point.x + stubLength, y: point.y }
    case Position.Left:
      return { x: point.x - stubLength, y: point.y }
    case Position.Bottom:
      return { x: point.x, y: point.y + stubLength }
    case Position.Top:
    default:
      return { x: point.x, y: point.y - stubLength }
  }
}

/**
 * Signed gap between two facing connection points, measured along the axis they
 * face each other on (positive when they point at each other, negative once
 * they have passed each other). Returns null for any other configuration.
 */
const getFacingGap = (
  sourcePoint: IPoint,
  targetPoint: IPoint,
  sourcePosition: Position,
  targetPosition: Position
): number | null => {
  if (sourcePosition === Position.Right && targetPosition === Position.Left) {
    return targetPoint.x - sourcePoint.x
  }
  if (sourcePosition === Position.Left && targetPosition === Position.Right) {
    return sourcePoint.x - targetPoint.x
  }
  if (sourcePosition === Position.Bottom && targetPosition === Position.Top) {
    return targetPoint.y - sourcePoint.y
  }
  if (sourcePosition === Position.Top && targetPosition === Position.Bottom) {
    return sourcePoint.y - targetPoint.y
  }
  return null
}

/**
 * True when two facing points share the lane they face each other on, so the
 * edge is a single straight line. Collinear stubs can never fold back on each
 * other, however close the nodes get — no turn is needed between them.
 */
const isStraightFacingShot = (
  sourcePoint: IPoint,
  targetPoint: IPoint,
  sourcePosition: Position,
  targetPosition: Position
): boolean => {
  const gap = getFacingGap(
    sourcePoint,
    targetPoint,
    sourcePosition,
    targetPosition
  )
  if (gap === null || gap <= 0) return false

  return getSegmentAxisForPosition(sourcePosition) === "horizontal"
    ? sourcePoint.y === targetPoint.y
    : sourcePoint.x === targetPoint.x
}

/**
 * Stub length the router may actually spend on this edge. Two facing nodes
 * closer than 2 * STUB_LENGTH cannot host a full stub on both sides — the stubs
 * would overshoot each other and the route doubles back into a loop. Shrinking
 * the stub to half the available gap (never below MIN_STUB_LENGTH) keeps close
 * nodes on a clean Z, so the detour is reserved for nodes that really are too
 * close to turn between.
 */
export const getEffectiveStubLength = (
  sourcePoint: IPoint,
  targetPoint: IPoint,
  sourcePosition: Position,
  targetPosition: Position
): number => {
  const gap = getFacingGap(
    sourcePoint,
    targetPoint,
    sourcePosition,
    targetPosition
  )
  if (gap === null || gap <= 0) return EDGES.STUB_LENGTH

  // A straight shot spends the whole gap on its two collinear stubs, so it is
  // never "too short" — cap the requirement at the gap itself.
  if (
    isStraightFacingShot(
      sourcePoint,
      targetPoint,
      sourcePosition,
      targetPosition
    )
  ) {
    return Math.min(EDGES.STUB_LENGTH, gap)
  }

  // Round the half-gap DOWN to a whole grid cell: endpoints sit on the node
  // border and nodes are grid-snapped, so a grid-multiple stub lands the corner
  // on a grid line — the same line a dragged bend snaps to.
  const halfGapOnGrid =
    Math.floor(gap / 2 / CANVAS.SNAP_TO_GRID_PX) * CANVAS.SNAP_TO_GRID_PX

  return Math.max(
    EDGES.MIN_STUB_LENGTH,
    Math.min(EDGES.STUB_LENGTH, halfGapOnGrid)
  )
}

const toCanvasGrid = (value: number): number =>
  Math.round(value / CANVAS.SNAP_TO_GRID_PX) * CANVAS.SNAP_TO_GRID_PX

/**
 * Whether a lane may sit at `lane` without wrecking the geometry at `point`.
 * BOTH axes must be checked:
 *
 * - A lane running ALONG the stub's travel axis fixes the stub's length, so it
 *   must stay at least `stubLength` beyond the connection point.
 * - A lane running ACROSS it shares the stub's own line if it lands on the
 *   endpoint's coordinate, collapsing the corner. It has to keep a grid cell of
 *   clearance so the turn survives.
 */
const laneClearsEndpoint = (
  lane: number,
  axis: "x" | "y",
  point: IPoint,
  position: Position,
  stubLength: number
): boolean => {
  const alongStub = (limit: number, keepAbove: boolean): boolean =>
    keepAbove ? lane >= limit : lane <= limit
  const acrossStub = (coordinate: number): boolean =>
    Math.abs(lane - coordinate) >= CANVAS.SNAP_TO_GRID_PX

  switch (position) {
    case Position.Right:
      return axis === "x"
        ? alongStub(point.x + stubLength, true)
        : acrossStub(point.y)
    case Position.Left:
      return axis === "x"
        ? alongStub(point.x - stubLength, false)
        : acrossStub(point.y)
    case Position.Bottom:
      return axis === "y"
        ? alongStub(point.y + stubLength, true)
        : acrossStub(point.x)
    case Position.Top:
    default:
      return axis === "y"
        ? alongStub(point.y - stubLength, false)
        : acrossStub(point.x)
  }
}

/**
 * Pulls the lanes of a route onto the canvas grid, so a corner the router places
 * lands on the same grid line a dragged bend snaps to. Without this, a route
 * through the midpoint of an odd gap sits half a cell off and the first drag of
 * that bend visibly jumps.
 *
 * Snapping must never *create* a problem the raw route did not have, so a lane
 * only moves to a grid line that still clears both endpoints, and the closest
 * such line wins. If none clears them, the router's own lane is kept — an
 * off-grid lane is a blemish, a collapsed corner is a broken edge.
 */
const snapRouteLanesToGrid = (
  points: IPoint[],
  sourcePoint: IPoint,
  targetPoint: IPoint,
  sourcePosition: Position,
  targetPosition: Position,
  stubLength: number
): IPoint[] => {
  if (points.length < 4) return points

  const snapped = points.map((point) => ({ ...point }))
  // Segments run points[i] -> points[i + 1]: the first and last are the stubs
  // themselves, so the lanes they land on are points[1] through points[n - 2].
  const lastLane = snapped.length - 3

  for (let i = 1; i <= lastLane; i++) {
    const start = snapped[i]
    const end = snapped[i + 1]
    const axis: "x" | "y" | null =
      start.x === end.x ? "x" : start.y === end.y ? "y" : null
    if (!axis) continue

    const lane = start[axis]
    const nearest = toCanvasGrid(lane)
    const grid = CANVAS.SNAP_TO_GRID_PX
    const candidates = [nearest, nearest - grid, nearest + grid].sort(
      (a, b) => Math.abs(a - lane) - Math.abs(b - lane)
    )
    // Every lane is checked against BOTH endpoints: the stub-length half only
    // bites on lanes next to a stub, but the collapsed-corner half applies
    // anywhere on the path.
    const fits = (candidate: number): boolean =>
      (i !== 1 ||
        laneClearsEndpoint(
          candidate,
          axis,
          sourcePoint,
          sourcePosition,
          stubLength
        )) &&
      (i !== lastLane ||
        laneClearsEndpoint(
          candidate,
          axis,
          targetPoint,
          targetPosition,
          stubLength
        )) &&
      laneKeepsCorner(candidate, axis, sourcePoint, sourcePosition) &&
      laneKeepsCorner(candidate, axis, targetPoint, targetPosition)

    const chosen = candidates.find(fits) ?? lane
    start[axis] = chosen
    end[axis] = chosen
  }

  return snapped
}

/**
 * The across-the-stub half of `laneClearsEndpoint`, on its own: a lane that
 * lands on an endpoint's perpendicular coordinate collapses that endpoint's
 * corner, wherever on the path the lane sits.
 */
const laneKeepsCorner = (
  lane: number,
  axis: "x" | "y",
  point: IPoint,
  position: Position
): boolean => {
  const stubAxis =
    getSegmentAxisForPosition(position) === "horizontal" ? "x" : "y"
  if (axis === stubAxis) return true

  return Math.abs(lane - point[axis]) >= CANVAS.SNAP_TO_GRID_PX
}

/**
 * A route the editor can accept: axis-aligned, leaving and entering its nodes
 * the way the handles point, and never doubling back along a line it has already
 * drawn. The last matters most: getSmoothStepPath can emit a route that
 * overshoots the target and returns along the same line when the source's stub
 * lane lands on the target's approach lane; once the collinear points simplify
 * away, the target's stub points backwards and the edge fails validation.
 */
const isRoutableOrthogonalPath = (
  points: IPoint[],
  sourcePoint: IPoint,
  targetPoint: IPoint,
  sourcePosition: Position,
  targetPosition: Position
): boolean =>
  points.length >= 2 &&
  !hasDiagonalSegment(points) &&
  !hasCollapsingSegments(points) &&
  isSourceLaneCompatible(
    sourcePosition,
    sourcePoint,
    getLaneValue(
      points,
      1,
      getSegmentAxisForPosition(sourcePosition),
      targetPoint
    )
  ) &&
  isTargetApproachCompatible(
    targetPosition,
    points[points.length - 2],
    targetPoint
  )

/**
 * Pushes any lane that runs ALONGSIDE and overlaps an endpoint's stub away from
 * it: a lane only a grid cell from a parallel stub leaves a sliver users read as
 * broken, so it must keep a stub's worth of clearance. It is pushed to whichever
 * side it is ALREADY on (from `previousLanes`) so a node dragged past this point
 * does not flip the edge from routing over the top to underneath.
 */
const pushLanesClearOfStubs = (
  points: IPoint[],
  sourcePoint: IPoint,
  targetPoint: IPoint,
  sourcePosition: Position,
  targetPosition: Position,
  previousLanes?: IPoint[]
): IPoint[] => {
  if (points.length < 4) return points

  const result = points.map((point) => ({ ...point }))
  const lastLane = result.length - 3
  const minStub = getMinimumStubLength(
    sourcePoint,
    targetPoint,
    sourcePosition,
    targetPosition
  )
  const clearance = EDGES.STUB_LENGTH

  const stubs = [
    {
      point: sourcePoint,
      position: sourcePosition,
      from: result[0],
      to: result[1],
      adjacentLane: 1,
    },
    {
      point: targetPoint,
      position: targetPosition,
      from: result[result.length - 2],
      to: result[result.length - 1],
      adjacentLane: lastLane,
    },
  ]

  for (let i = 1; i <= lastLane; i++) {
    const start = result[i]
    const end = result[i + 1]
    // The coordinate the segment holds constant IS the lane; the other one is
    // the direction it runs in.
    const lane: "x" | "y" | null =
      start.x === end.x ? "x" : start.y === end.y ? "y" : null
    if (!lane) continue
    const along = lane === "x" ? "y" : "x"

    // Every stub line this lane runs alongside and overlaps. Both have to be
    // satisfied AT ONCE: clearing them one after another lets the second push
    // land the lane straight back on the first one's line.
    const lines = stubs
      .filter((stub) => {
        const stubLane =
          getSegmentAxisForPosition(stub.position) === "horizontal" ? "y" : "x"
        if (stubLane !== lane) return false

        // A lane parallel to the stub it is NEXT TO shares that stub's far
        // point, so moving it would drag the stub off its axis and leave a
        // diagonal. Such a path is already doubling back on itself: it needs a
        // corner inserted, not a lane nudged, and the router re-routes it with a
        // different stub instead.
        if (stub.adjacentLane === i) return false

        const laneFrom = Math.min(start[along], end[along])
        const laneTo = Math.max(start[along], end[along])
        const stubFrom = Math.min(stub.from[along], stub.to[along])
        const stubTo = Math.max(stub.from[along], stub.to[along])
        return Math.max(laneFrom, stubFrom) < Math.min(laneTo, stubTo)
      })
      .map((stub) => stub.point[lane])
    if (lines.length === 0) continue

    const previous = previousLanes?.[i]?.[lane]
    const isClear = (value: number): boolean =>
      lines.every((line) => Math.abs(value - line) >= clearance)
    // A re-route may also swing a lane clean over a stub's line to the far side
    // — the edge stops going over the top and starts going underneath, a large
    // jump for a small node nudge, and usually straight through the node body it
    // used to go around. A stored route says which side it was on; keep it there.
    const flipped =
      previous !== undefined &&
      lines.some(
        (line) =>
          previous !== line &&
          Math.sign(start[lane] - line) !== Math.sign(previous - line)
      )
    // A lane the stored route already placed on THIS side of the stub is the user's —
    // even a deliberately narrow U that runs close to a parallel stub. Keep it. Only
    // re-clear a lane that has no stored side yet (a fresh route) or one that FLIPPED
    // across the stub to the far side. Otherwise dragging a lane toward a stub would be
    // snapped straight back to the clearance line.
    if (!flipped && (isClear(start[lane]) || previous !== undefined)) continue

    const reference = previous ?? start[lane]
    const candidates = lines
      .flatMap((line) => [line - clearance, line + clearance])
      .map(toCanvasGrid)
      .filter(
        (candidate) =>
          isClear(candidate) &&
          (i !== 1 ||
            laneClearsEndpoint(
              candidate,
              lane,
              sourcePoint,
              sourcePosition,
              minStub
            )) &&
          (i !== lastLane ||
            laneClearsEndpoint(
              candidate,
              lane,
              targetPoint,
              targetPosition,
              minStub
            ))
      )
      .sort(
        (a, b) => Math.abs(a - reference) - Math.abs(b - reference) || a - b
      )

    // Nothing clears every stub: leave the router's lane alone rather than
    // shoving it onto one of the very lines it was supposed to avoid.
    if (candidates.length === 0) continue

    start[lane] = candidates[0]
    end[lane] = candidates[0]
  }

  return result
}

/**
 * How badly a route misbehaves, as a tuple compared left to right. Lower wins.
 *
 * Crossings are COUNTED, never measured by area. Area is a continuous function
 * of node position, so the winning candidate would flip on sub-pixel movement
 * and the edge would shimmer while a node is dragged. A count only changes when
 * a node actually crosses the line — which is precisely when the user expects
 * the route to change.
 */
type RouteScore = [
  hardCrossings: number,
  softCrossings: number,
  bends: number,
  length: number,
  order: number,
]

const segmentHitsRect = (
  from: IPoint,
  to: IPoint,
  rect: ObstacleRect
): boolean => {
  const left = Math.min(from.x, to.x)
  const right = Math.max(from.x, to.x)
  const top = Math.min(from.y, to.y)
  const bottom = Math.max(from.y, to.y)

  return (
    left < rect.x + rect.width &&
    right > rect.x &&
    top < rect.y + rect.height &&
    bottom > rect.y
  )
}

const countCrossings = (
  points: IPoint[],
  obstacles: readonly ObstacleRect[]
): { hard: number; soft: number } => {
  let hard = 0
  let soft = 0

  for (const rect of obstacles) {
    let hit = false
    for (let i = 0; i < points.length - 1 && !hit; i++) {
      hit = segmentHitsRect(points[i], points[i + 1], rect)
    }
    if (!hit) continue
    if (rect.soft) soft += 1
    else hard += 1
  }

  return { hard, soft }
}

/**
 * Whether a route runs through the body of any HARD obstacle. Soft obstacles
 * (containers) are meant to be crossed, so they never count. Used to decide
 * whether a cheaper route — a straight shot, say — has to give way to the
 * obstacle-avoiding router.
 */
export const routeCrossesHardObstacle = (
  points: IPoint[],
  obstacles: readonly ObstacleRect[]
): boolean => countCrossings(points, obstacles).hard > 0

const getRouteScore = (
  points: IPoint[],
  obstacles: readonly ObstacleRect[],
  order: number
): RouteScore => {
  const { hard, soft } = countCrossings(points, obstacles)
  let length = 0
  for (let i = 0; i < points.length - 1; i++) {
    length +=
      Math.abs(points[i + 1].x - points[i].x) +
      Math.abs(points[i + 1].y - points[i].y)
  }

  return [hard, soft, Math.max(points.length - 2, 0), length, order]
}

const isBetterScore = (a: RouteScore, b: RouteScore): boolean => {
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return a[i] < b[i]
  }
  return false
}

/**
 * A route that leaves both nodes by their stubs and bridges across on `lane`.
 * The lane is the one degree of freedom the router has to steer with, so this is
 * what obstacle avoidance actually moves.
 */
const buildBridgeRoute = (
  sourcePoint: IPoint,
  targetPoint: IPoint,
  sourcePosition: Position,
  targetPosition: Position,
  stubLength: number,
  lane: number
): IPoint[] => {
  const sourceStub = getStubExitPoint(sourcePosition, sourcePoint, stubLength)
  const targetStub = getStubExitPoint(targetPosition, targetPoint, stubLength)

  if (getSegmentAxisForPosition(sourcePosition) === "horizontal") {
    return removeDuplicatePoints([
      sourcePoint,
      sourceStub,
      { x: sourceStub.x, y: lane },
      { x: targetStub.x, y: lane },
      targetStub,
      targetPoint,
    ])
  }

  return removeDuplicatePoints([
    sourcePoint,
    sourceStub,
    { x: lane, y: sourceStub.y },
    { x: lane, y: targetStub.y },
    targetStub,
    targetPoint,
  ])
}

/**
 * Lanes worth trying, taken from the obstacles themselves: just past each side
 * of every node in the way. A lane derived from an obstacle boundary is the only
 * kind that can actually get PAST that obstacle — sweeping stub lengths only
 * ever nudges the route, it never steps it around a box.
 *
 * They are generated already on the grid, because snapping a lane afterwards can
 * push it back into the very obstacle it was chosen to clear.
 */
const getObstacleLanes = (
  obstacles: readonly ObstacleRect[],
  sourcePosition: Position
): number[] => {
  const grid = CANVAS.SNAP_TO_GRID_PX
  const acrossY = getSegmentAxisForPosition(sourcePosition) === "horizontal"
  const lanes = new Set<number>()

  for (const rect of obstacles) {
    if (acrossY) {
      lanes.add(toCanvasGrid(rect.y - grid))
      lanes.add(toCanvasGrid(rect.y + rect.height + grid))
    } else {
      lanes.add(toCanvasGrid(rect.x - grid))
      lanes.add(toCanvasGrid(rect.x + rect.width + grid))
    }
  }

  return [...lanes]
}

export const routeOrthogonalPath = (
  sourcePoint: IPoint,
  targetPoint: IPoint,
  sourcePosition: Position,
  targetPosition: Position,
  obstacles: readonly ObstacleRect[] = [],
  neighborEdges: readonly IPoint[][] = []
): IPoint[] => {
  const stubLength = getEffectiveStubLength(
    sourcePoint,
    targetPoint,
    sourcePosition,
    targetPosition
  )
  const minStub = getMinimumStubLength(
    sourcePoint,
    targetPoint,
    sourcePosition,
    targetPosition
  )

  const routeWithStub = (offset: number): IPoint[] => {
    const [path] = getSmoothStepPath({
      sourceX: sourcePoint.x,
      sourceY: sourcePoint.y,
      sourcePosition,
      targetX: targetPoint.x,
      targetY: targetPoint.y,
      targetPosition,
      borderRadius: EDGES.STEP_BORDER_RADIUS,
      offset,
    })

    return removeDuplicatePoints(
      pushLanesClearOfStubs(
        snapRouteLanesToGrid(
          removeDuplicatePoints(parseSvgPath(simplifySvgPath(path))),
          sourcePoint,
          targetPoint,
          sourcePosition,
          targetPosition,
          offset
        ),
        sourcePoint,
        targetPoint,
        sourcePosition,
        targetPosition
      )
    )
  }

  // When the preferred stub puts the route on top of itself, the stub itself is
  // the problem — the lane it lands on collides with the target's. Step it a
  // grid cell either way and the collision disappears; a stub a cell longer or
  // shorter is invisible next to an edge drawn over its own body.
  const grid = CANVAS.SNAP_TO_GRID_PX
  const offsets = [
    stubLength,
    stubLength + grid,
    stubLength - grid,
    stubLength + 2 * grid,
  ].filter((offset) => offset >= minStub)

  // Candidates, in a fixed order — the order IS the tiebreak, so it is part of
  // the contract that makes this router deterministic.
  const candidates: IPoint[][] = offsets.map(routeWithStub)

  // The cheap route: the first structurally valid stub-and-lane candidate, kept
  // unless it genuinely runs through something.
  const cheapRoute = candidates.find((points) =>
    isRoutableOrthogonalPath(
      points,
      sourcePoint,
      targetPoint,
      sourcePosition,
      targetPosition
    )
  )

  // Keep the cheap route only when it meets all three conditions below; fail any
  // one and the search takes over under a cost model that can weigh them against
  // each other. Crossing nothing solid is not enough on its own: a segment
  // running exactly ALONG a node's border does not "cross" it but still looks
  // drawn on the node.
  //
  //  1. It crosses nothing SOLID. Soft obstacles (packages, pools) are meant to
  //     be crossed when going around would force a horseshoe; the endpoint bodies
  //     are solid, which stops an edge cutting back across its own source.
  //  2. It keeps the clearance the ROUTER would have kept: 25px BESIDE any body,
  //     or the middle of the channel where 25px will not fit.
  //  3. It is not drawn on top of, or cramped against, a neighbouring edge.
  const hardObstacles = obstacles.filter((o) => !o.soft)
  const cheapClearOfHard =
    cheapRoute !== undefined &&
    countCrossings(cheapRoute, hardObstacles).hard === 0
  const cheapKeepsClearance =
    cheapRoute !== undefined &&
    !routeRunsTooCloseToBody(
      cheapRoute,
      hardObstacles,
      EDGES.NODE_CLEARANCE_PX,
      EDGES.MIN_NODE_CLEARANCE_PX,
      CANVAS.SNAP_TO_GRID_PX,
      // The stubs are not the router's to fix — every route out of this handle runs
      // on the same line — so holding the cheap route to a standard no route can
      // meet would just buy a search that returns the same stub.
      stubLength
    )
  const cheapClearOfEdges =
    cheapRoute !== undefined &&
    !routeConflictsWithNeighborEdges(cheapRoute, neighborEdges)
  if (
    cheapRoute &&
    cheapClearOfHard &&
    cheapKeepsClearance &&
    cheapClearOfEdges
  ) {
    return cheapRoute
  }

  // Nothing at all to avoid — no solid obstacle and no neighbour edge: keep the
  // legacy route exactly, down to the fallback, so an edge that conflicts with
  // nothing does not depend on the router existing.
  if (hardObstacles.length === 0 && neighborEdges.length === 0) {
    return (
      cheapRoute ??
      getStubCollisionFallbackPoints(
        sourcePoint,
        targetPoint,
        sourcePosition,
        targetPosition
      )
    )
  }

  // The cheap route hits something solid. Bring in the real router: A* over a
  // sparse orthogonal grid, returning the optimal obstacle-avoiding route under
  // a single consistent cost model (length, a penalty per bend, a large penalty
  // per soft crossing). When it succeeds it is trusted outright — re-ranking it
  // with the lexicographic score below would compare two different cost models,
  // and the lexicographic one (bends before length) will happily prefer a route
  // three times as long to save one corner. Candidate scoring is only the
  // fallback for the rare graph A* cannot solve.
  const searched = routeAroundObstacles(
    sourcePoint,
    targetPoint,
    sourcePosition,
    targetPosition,
    obstacles,
    stubLength,
    stubLength,
    neighborEdges
  )
  if (
    searched &&
    isRoutableOrthogonalPath(
      searched,
      sourcePoint,
      targetPoint,
      sourcePosition,
      targetPosition
    )
  ) {
    return searched
  }

  // Lanes taken from the obstacles in the way: a cheap, structurally simple
  // fallback for the common single-box case, and insurance for the rare graph
  // A* cannot solve.
  for (const lane of getObstacleLanes(obstacles, sourcePosition)) {
    candidates.push(
      buildBridgeRoute(
        sourcePoint,
        targetPoint,
        sourcePosition,
        targetPosition,
        stubLength,
        lane
      )
    )
  }

  // Always last, and always structurally sound, so something is always returned.
  candidates.push(
    getStubCollisionFallbackPoints(
      sourcePoint,
      targetPoint,
      sourcePosition,
      targetPosition
    )
  )

  let best: IPoint[] | null = null
  let bestScore: RouteScore | null = null
  candidates.forEach((points, order) => {
    if (
      !isRoutableOrthogonalPath(
        points,
        sourcePoint,
        targetPoint,
        sourcePosition,
        targetPosition
      )
    ) {
      return
    }
    const score = getRouteScore(points, obstacles, order)
    if (!bestScore || isBetterScore(score, bestScore)) {
      best = points
      bestScore = score
    }
  })

  return (
    best ??
    getStubCollisionFallbackPoints(
      sourcePoint,
      targetPoint,
      sourcePosition,
      targetPosition
    )
  )
}

/**
 * Picks the lane a detour bridges across on, given the two coordinates it has to
 * pass between (the endpoints' perpendicular coordinates).
 *
 * The obvious answer — the midpoint — is a trap: rounded to the grid it can land
 * ON one of the endpoints, and a bridge sharing an endpoint's line runs straight
 * back over that endpoint's own stub. So the lane must keep a grid cell of
 * clearance from BOTH. When the two coordinates are too close together to leave
 * room between them, there is no lane in the middle at all and the detour has to
 * go around the outside instead.
 */
const getDetourLane = (sourceCoord: number, targetCoord: number): number => {
  const grid = CANVAS.SNAP_TO_GRID_PX
  const low = Math.min(sourceCoord, targetCoord)
  const high = Math.max(sourceCoord, targetCoord)

  if (high - low >= 2 * grid) {
    const middle = (low + high) / 2
    const lowest = Math.ceil((low + grid) / grid) * grid
    const highest = Math.floor((high - grid) / grid) * grid
    if (lowest <= highest) {
      const snapped = toCanvasGrid(middle)
      if (snapped >= lowest && snapped <= highest) return snapped
      return Math.abs(lowest - middle) <= Math.abs(highest - middle)
        ? lowest
        : highest
    }
  }

  // Nothing fits between them: bridge clear of both, on the low side.
  return toCanvasGrid(low - EDGES.STUB_LENGTH)
}

const getStubCollisionFallbackPoints = (
  sourcePoint: IPoint,
  targetPoint: IPoint,
  sourcePosition: Position,
  targetPosition: Position
): IPoint[] => {
  const sharedLaneSnapTolerance = Math.abs(
    EDGES.SOURCE_CONNECTION_POINT_PADDING - EDGES.MARKER_PADDING
  )
  const sourceStub = getStubExitPoint(
    sourcePosition,
    sourcePoint,
    EDGES.STUB_LENGTH
  )
  const targetStub = getStubExitPoint(
    targetPosition,
    targetPoint,
    EDGES.STUB_LENGTH
  )
  const sourceAxis = getSegmentAxisForPosition(sourcePosition)

  if (sourceAxis === "horizontal") {
    const stubLaneDelta = Math.abs(sourceStub.x - targetStub.x)
    if (
      sourcePoint.y !== targetPoint.y &&
      stubLaneDelta > 0 &&
      stubLaneDelta <= sharedLaneSnapTolerance
    ) {
      const sharedX = Math.round((sourceStub.x + targetStub.x) / 2)
      return removeDuplicatePoints([
        sourcePoint,
        { x: sharedX, y: sourcePoint.y },
        { x: sharedX, y: targetPoint.y },
        targetPoint,
      ])
    }

    const bridgeY = getDetourLane(sourcePoint.y, targetPoint.y)
    return removeDuplicatePoints([
      sourcePoint,
      sourceStub,
      { x: sourceStub.x, y: bridgeY },
      { x: targetStub.x, y: bridgeY },
      targetStub,
      targetPoint,
    ])
  }

  const stubLaneDelta = Math.abs(sourceStub.y - targetStub.y)
  if (
    sourcePoint.x !== targetPoint.x &&
    stubLaneDelta > 0 &&
    stubLaneDelta <= sharedLaneSnapTolerance
  ) {
    const sharedY = Math.round((sourceStub.y + targetStub.y) / 2)
    return removeDuplicatePoints([
      sourcePoint,
      { x: sourcePoint.x, y: sharedY },
      { x: targetPoint.x, y: sharedY },
      targetPoint,
    ])
  }

  const bridgeX = getDetourLane(sourcePoint.x, targetPoint.x)
  return removeDuplicatePoints([
    sourcePoint,
    sourceStub,
    { x: bridgeX, y: sourceStub.y },
    { x: bridgeX, y: targetStub.y },
    targetStub,
    targetPoint,
  ])
}

/**
 * Drops interior points that sit on the straight line between their neighbours
 * — a shrunken stub can pull a preserved lane onto its own line, leaving a
 * corner that no longer turns. The two stub exits are kept even when collinear:
 * they stay locked to the node and anchor the terminal bend handles.
 */
const removeRedundantLanes = (
  points: IPoint[],
  sourceStubExit: IPoint,
  targetStubExit: IPoint
): IPoint[] => {
  if (points.length < 3) return points

  const isStubExit = (point: IPoint): boolean =>
    (point.x === sourceStubExit.x && point.y === sourceStubExit.y) ||
    (point.x === targetStubExit.x && point.y === targetStubExit.y)

  const kept: IPoint[] = [points[0]]
  for (let i = 1; i < points.length - 1; i++) {
    const previous = kept[kept.length - 1]
    const current = points[i]
    const next = points[i + 1]
    const collinear =
      (previous.x === current.x && current.x === next.x) ||
      (previous.y === current.y && current.y === next.y)
    if (collinear && !isStubExit(current)) continue
    kept.push(current)
  }
  kept.push(points[points.length - 1])

  return kept
}

const hasCollapsingSegments = (result: IPoint[]): boolean => {
  for (let i = 1; i < result.length - 2; i++) {
    const prev = result[i - 1]
    const curr = result[i]
    const next = result[i + 1]
    const horizBack =
      prev.y === curr.y &&
      curr.y === next.y &&
      (curr.x - prev.x) * (next.x - curr.x) < 0
    const vertBack =
      prev.x === curr.x &&
      curr.x === next.x &&
      (curr.y - prev.y) * (next.y - curr.y) < 0
    if (horizBack || vertBack) return true
  }
  return false
}

/**
 * Returns true when source and target stubs point toward each other and would
 * genuinely overlap. This catches the "narrow U" case — where the two arms of a
 * U-shape cross — before the geometry has actually inverted (which
 * hasCollapsingSegments catches too late).
 *
 * Stubs that meet exactly do NOT overlap: they share one lane and turn cleanly
 * on it, which is the tightest route two facing nodes can have. Only a real
 * crossing forces the detour.
 *
 * Only applies to facing-stub configurations where both stubs exit into the
 * same space and can collide. Diverging pairs are handled by later validation.
 * Facing points that share a lane are exempt: they connect with a straight line,
 * which has no arms to collapse no matter how close the nodes sit.
 */
export const stubsWouldOverlap = (
  sourcePoint: IPoint,
  targetPoint: IPoint,
  sourcePosition: Position,
  targetPosition: Position,
  stubLength: number
): boolean => {
  if (
    isStraightFacingShot(
      sourcePoint,
      targetPoint,
      sourcePosition,
      targetPosition
    )
  ) {
    return false
  }

  if (sourcePosition === Position.Right && targetPosition === Position.Left) {
    return (
      sourcePoint.x < targetPoint.x &&
      sourcePoint.x + stubLength > targetPoint.x - stubLength
    )
  }
  if (sourcePosition === Position.Left && targetPosition === Position.Right) {
    return (
      sourcePoint.x > targetPoint.x &&
      sourcePoint.x - stubLength < targetPoint.x + stubLength
    )
  }
  if (sourcePosition === Position.Bottom && targetPosition === Position.Top) {
    return (
      sourcePoint.y < targetPoint.y &&
      sourcePoint.y + stubLength > targetPoint.y - stubLength
    )
  }
  if (sourcePosition === Position.Top && targetPosition === Position.Bottom) {
    return (
      sourcePoint.y > targetPoint.y &&
      sourcePoint.y - stubLength < targetPoint.y + stubLength
    )
  }
  return false
}

const hasDiagonalSegment = (points: IPoint[]): boolean =>
  points.some((point, index) => {
    if (index === 0) return false
    const previous = points[index - 1]
    return previous.x !== point.x && previous.y !== point.y
  })

const getSourceStubLength = (
  points: IPoint[],
  sourcePoint: IPoint,
  sourcePosition: Position
): number => {
  const first = points[1]
  if (!first) return 0

  switch (sourcePosition) {
    case Position.Right:
      return first.y === sourcePoint.y ? first.x - sourcePoint.x : -Infinity
    case Position.Left:
      return first.y === sourcePoint.y ? sourcePoint.x - first.x : -Infinity
    case Position.Bottom:
      return first.x === sourcePoint.x ? first.y - sourcePoint.y : -Infinity
    case Position.Top:
    default:
      return first.x === sourcePoint.x ? sourcePoint.y - first.y : -Infinity
  }
}

const getTargetStubLength = (
  points: IPoint[],
  targetPoint: IPoint,
  targetPosition: Position
): number => {
  const penultimate = points[points.length - 2]
  if (!penultimate) return 0

  switch (targetPosition) {
    case Position.Left:
      return penultimate.y === targetPoint.y
        ? targetPoint.x - penultimate.x
        : -Infinity
    case Position.Right:
      return penultimate.y === targetPoint.y
        ? penultimate.x - targetPoint.x
        : -Infinity
    case Position.Top:
      return penultimate.x === targetPoint.x
        ? targetPoint.y - penultimate.y
        : -Infinity
    case Position.Bottom:
    default:
      return penultimate.x === targetPoint.x
        ? penultimate.y - targetPoint.y
        : -Infinity
  }
}

/**
 * The floor a terminal stub may not go under. This is the MINIMUM stub, not the
 * preferred one: STUB_LENGTH is what the router *reaches for* when it has room,
 * but a user who drags a bend in towards the node is allowed to take the stub
 * all the way down to MIN_STUB_LENGTH. Validating against the preferred length
 * would bounce that drag straight back.
 */
const getMinimumStubLength = (
  sourcePoint: IPoint,
  targetPoint: IPoint,
  sourcePosition: Position,
  targetPosition: Position
): number =>
  Math.min(
    EDGES.MIN_STUB_LENGTH,
    // A straight shot between endpoints closer than the floor spends the whole
    // (tiny) gap on its stubs, and is still a perfectly good edge.
    getEffectiveStubLength(
      sourcePoint,
      targetPoint,
      sourcePosition,
      targetPosition
    )
  )

const hasReducedTerminalStub = (
  points: IPoint[],
  sourcePoint: IPoint,
  targetPoint: IPoint,
  sourcePosition: Position,
  targetPosition: Position
): boolean => {
  const minStub = getMinimumStubLength(
    sourcePoint,
    targetPoint,
    sourcePosition,
    targetPosition
  )

  return (
    getSourceStubLength(points, sourcePoint, sourcePosition) < minStub ||
    getTargetStubLength(points, targetPoint, targetPosition) < minStub
  )
}

const collapseTinyOrthogonalDoglegs = (
  points: IPoint[],
  proximityPx: number
): IPoint[] => {
  if (points.length < 5) return points

  let collapsed = points.map((point) => ({ ...point }))
  let changed = true

  while (changed) {
    changed = false

    for (let i = 1; i <= collapsed.length - 4; i++) {
      const a = collapsed[i]
      const b = collapsed[i + 1]
      const c = collapsed[i + 2]
      const d = collapsed[i + 3]

      const firstVertical = a.x === b.x
      const firstHorizontal = a.y === b.y
      const secondVertical = c.x === d.x
      const secondHorizontal = c.y === d.y

      if (firstVertical && secondVertical && b.y === c.y) {
        const connectorLength = Math.abs(c.x - b.x)
        const sameDirection = (b.y - a.y) * (d.y - c.y) > 0
        if (
          connectorLength > 0 &&
          connectorLength <= proximityPx &&
          sameDirection
        ) {
          const lane = i + 3 === collapsed.length - 2 ? c.x : a.x
          collapsed[i] = { ...a, x: lane }
          collapsed[i + 1] = { ...b, x: lane }
          collapsed[i + 2] = { ...c, x: lane }
          collapsed[i + 3] = { ...d, x: lane }
          collapsed = removeDuplicatePoints(simplifyPoints(collapsed))
          changed = true
          break
        }
      }

      if (firstHorizontal && secondHorizontal && b.x === c.x) {
        const connectorLength = Math.abs(c.y - b.y)
        const sameDirection = (b.x - a.x) * (d.x - c.x) > 0
        if (
          connectorLength > 0 &&
          connectorLength <= proximityPx &&
          sameDirection
        ) {
          const lane = i + 3 === collapsed.length - 2 ? c.y : a.y
          collapsed[i] = { ...a, y: lane }
          collapsed[i + 1] = { ...b, y: lane }
          collapsed[i + 2] = { ...c, y: lane }
          collapsed[i + 3] = { ...d, y: lane }
          collapsed = removeDuplicatePoints(simplifyPoints(collapsed))
          changed = true
          break
        }
      }
    }
  }

  return collapsed
}

const sanitizeReleasedPoints = (
  points: IPoint[],
  sourcePoint: IPoint,
  targetPoint: IPoint
): IPoint[] => {
  if (points.length < 2) return []

  const rounded = points.map((point) => ({
    x: Math.round(point.x),
    y: Math.round(point.y),
  }))
  rounded[0] = { ...sourcePoint }
  rounded[rounded.length - 1] = { ...targetPoint }

  return removeDuplicatePoints(simplifyPoints(removeDuplicatePoints(rounded)))
}

/**
 * Whether a released path is structurally broken and cannot be stored.
 *
 * This asks only about the GEOMETRY THE USER DREW. It deliberately does NOT
 * check whether the two nodes sit close together (`stubsWouldOverlap` reads only
 * the endpoints, so it can be true before the drag begins and revert every
 * release), nor whether two arms ended up near each other (non-local: a tight
 * pair at one end must not veto a drag at the other).
 *
 * The real invariants: a path needs two points, every segment must be
 * axis-aligned, and a stub must still leave the node. Bend drags are clamped to
 * legal lanes up front (see `getBendLaneBounds`), so this should rarely fire on
 * a drag; it guards paths arriving from elsewhere (imports, reconnects, peer edits).
 */
export function isInvalidOrthogonalEdgeRelease(
  points: IPoint[],
  sourcePoint: IPoint,
  targetPoint: IPoint,
  sourcePosition: Position,
  targetPosition: Position
): boolean {
  const sanitized = sanitizeReleasedPoints(points, sourcePoint, targetPoint)

  return (
    sanitized.length < 2 ||
    hasDiagonalSegment(sanitized) ||
    hasReducedTerminalStub(
      sanitized,
      sourcePoint,
      targetPoint,
      sourcePosition,
      targetPosition
    )
  )
}

export type BendLaneBounds = { min: number; max: number }

/**
 * The interval a dragged bend's lane may move within, along the axis it travels.
 *
 * A bend drag has exactly ONE degree of freedom: the lane coordinate. Every rule
 * that used to reject a release is really a bound on that scalar, so bounding it
 * up front makes the drag legal by construction — the edge follows the cursor
 * and then *stops* at a wall, instead of trailing the cursor into illegal space
 * and being yanked back on release.
 *
 * The only bound that is real: a lane next to an endpoint may not crowd that
 * endpoint's stub below the minimum, and may never cross to the far side of the
 * connection point (which would drive the edge back through its own node). Lanes
 * out in the open are unbounded — the user may take them anywhere, including
 * across other nodes.
 */
export function getBendLaneBounds(
  points: IPoint[],
  segmentIndex: number,
  orientation: "H" | "V",
  sourcePoint: IPoint,
  targetPoint: IPoint,
  sourcePosition: Position,
  targetPosition: Position
): BendLaneBounds {
  const bounds: BendLaneBounds = {
    min: Number.NEGATIVE_INFINITY,
    max: Number.POSITIVE_INFINITY,
  }
  const lastSegmentIndex = points.length - 2
  if (lastSegmentIndex < 0) return bounds

  const minStub = getMinimumStubLength(
    sourcePoint,
    targetPoint,
    sourcePosition,
    targetPosition
  )
  // The lane travels along x when the segment is vertical, along y when it is
  // horizontal. Only an endpoint whose stub runs on that SAME axis can be
  // crowded by this lane; a stub running across it is unaffected.
  const laneAxis = orientation === "V" ? "x" : "y"

  const constrainBy = (point: IPoint, position: Position): void => {
    switch (position) {
      case Position.Right:
        if (laneAxis === "x")
          bounds.min = Math.max(bounds.min, point.x + minStub)
        break
      case Position.Left:
        if (laneAxis === "x")
          bounds.max = Math.min(bounds.max, point.x - minStub)
        break
      case Position.Bottom:
        if (laneAxis === "y")
          bounds.min = Math.max(bounds.min, point.y + minStub)
        break
      case Position.Top:
        if (laneAxis === "y")
          bounds.max = Math.min(bounds.max, point.y - minStub)
        break
    }
  }

  // Segment 0 is the source stub and the last is the target stub, so only a lane
  // sitting immediately next to one of them can shorten it.
  if (segmentIndex === 1) constrainBy(sourcePoint, sourcePosition)
  if (segmentIndex === lastSegmentIndex - 1) {
    constrainBy(targetPoint, targetPosition)
  }

  // The two PARALLEL arms flanking this segment (two away, joined to it by the
  // perpendicular connectors i±1) are walls too: a lane must come to REST on an
  // adjacent arm — where the connector between them collapses to zero and the loop
  // merges — not sail through it and grow a fresh zig-zag on the far side. This is
  // what makes "drag the arms together" collapse the loop instead of pushing it
  // apart. Clamp toward whichever side each neighbour currently sits on; a neighbour
  // already coincident with this lane imposes no bound (the loop is already merged).
  const laneCoord = points[segmentIndex][laneAxis]
  const clampAgainstArm = (armIndex: number): void => {
    if (armIndex < 0 || armIndex > lastSegmentIndex) return
    const armCoord = points[armIndex][laneAxis]
    if (armCoord > laneCoord) bounds.max = Math.min(bounds.max, armCoord)
    else if (armCoord < laneCoord) bounds.min = Math.max(bounds.min, armCoord)
  }
  clampAgainstArm(segmentIndex - 2)
  clampAgainstArm(segmentIndex + 2)

  return bounds
}

/**
 * Two anchors sitting exactly on top of each other (one node dropped onto
 * another, or facing borders touching with aligned handles) have no route
 * between them: every router here dedupes the coincident points and hands back a
 * single-point "path" that the rest of the pipeline — which assumes at least a
 * source and a target — reads off the end of and crashes on. Give those callers
 * the degenerate two-point edge they can handle.
 */
const isDegenerateRoute = (sourcePoint: IPoint, targetPoint: IPoint): boolean =>
  sourcePoint.x === targetPoint.x && sourcePoint.y === targetPoint.y

const getDegenerateRoute = (
  sourcePoint: IPoint,
  targetPoint: IPoint
): IPoint[] => [{ ...sourcePoint }, { ...targetPoint }]

/**
 * A point where the path REVERSES on itself along one axis — the two segments meeting
 * there are collinear but point in opposite directions (a spike/fold). This is what a
 * squeezed loop leaves once an arm is dragged flat onto its neighbour: dragging the
 * PINNED terminal arm cannot merge into that neighbour cleanly (its port is fixed), so
 * it folds and leaves a residual jog no simplify pass removes. A fold is never a shape
 * worth keeping, so its presence marks a "collapse this loop" gesture.
 */
const hasAxisFold = (points: IPoint[]): boolean => {
  for (let i = 1; i < points.length - 1; i++) {
    const a = points[i - 1]
    const b = points[i]
    const c = points[i + 1]
    const collinear =
      (a.x === b.x && b.x === c.x) || (a.y === b.y && b.y === c.y)
    const reverses = (b.x - a.x) * (c.x - b.x) + (b.y - a.y) * (c.y - b.y) < 0
    if (collinear && reverses) return true
  }
  return false
}

export function normalizeOrthogonalEdgePoints(
  points: IPoint[],
  sourcePoint: IPoint,
  targetPoint: IPoint,
  sourcePosition: Position,
  targetPosition: Position,
  obstacles: readonly ObstacleRect[] = []
): IPoint[] {
  if (isDegenerateRoute(sourcePoint, targetPoint)) {
    return getDegenerateRoute(sourcePoint, targetPoint)
  }

  // A fold is a spike: an arm squeezed flat onto its neighbour so the path reverses on
  // itself. Remove ONLY that spike — the collinear reversal collapses under simplify —
  // and keep the rest of the user's route, so a multi-bend edge loses just the squeezed
  // step (three corners stay three corners minus one), not every corner. Done here (not
  // only at release) so the geometry re-projection after a drag cannot re-introduce it.
  if (hasAxisFold(points)) {
    return sanitizeReleasedPoints(points, sourcePoint, targetPoint)
  }

  const hasStubCollision = stubsWouldOverlap(
    sourcePoint,
    targetPoint,
    sourcePosition,
    targetPosition,
    EDGES.MIN_STUB_LENGTH
  )
  const fallback = hasStubCollision
    ? getStubCollisionFallbackPoints(
        sourcePoint,
        targetPoint,
        sourcePosition,
        targetPosition
      )
    : routeOrthogonalPath(
        sourcePoint,
        targetPoint,
        sourcePosition,
        targetPosition,
        obstacles
      )

  const sanitized = sanitizeReleasedPoints(points, sourcePoint, targetPoint)
  if (
    sanitized.length < 2 ||
    hasDiagonalSegment(sanitized) ||
    hasReducedTerminalStub(
      sanitized,
      sourcePoint,
      targetPoint,
      sourcePosition,
      targetPosition
    ) ||
    hasStubCollision
  ) {
    return fallback
  }

  const normalized = preserveOrthogonalEdgePoints(
    sanitized,
    sourcePoint,
    targetPoint,
    sourcePosition,
    targetPosition,
    obstacles
  )

  const canonical = sanitizeReleasedPoints(normalized, sourcePoint, targetPoint)

  return canonical.length >= 2 && !hasDiagonalSegment(canonical)
    ? canonical
    : fallback
}

export function resolveOrthogonalEdgeReleasePoints(
  releasedPoints: IPoint[],
  lastValidPoints: IPoint[],
  sourcePoint: IPoint,
  targetPoint: IPoint,
  sourcePosition: Position,
  targetPosition: Position
): IPoint[] {
  const invalid = isInvalidOrthogonalEdgeRelease(
    releasedPoints,
    sourcePoint,
    targetPoint,
    sourcePosition,
    targetPosition
  )

  // A release that FOLDS an arm flat onto its neighbour (a spike where the path reverses
  // on itself) is a deliberate "collapse this loop" gesture, not a bad drag — keep the
  // released geometry so normalizeOrthogonalEdgePoints routes it to the clean path rather
  // than snapping back. Any other invalidity still falls back safely. A merely NARROW
  // loop (arms close but not touching) is NOT a fold: it is kept exactly as drawn and
  // only collapses once the arms actually meet.
  const sanitized = sanitizeReleasedPoints(
    releasedPoints,
    sourcePoint,
    targetPoint
  )
  const folded = hasAxisFold(sanitized)
  const pointsToNormalize =
    invalid && !folded ? lastValidPoints : releasedPoints

  return normalizeOrthogonalEdgePoints(
    pointsToNormalize,
    sourcePoint,
    targetPoint,
    sourcePosition,
    targetPosition
  )
}
/**
 * `obstacles` here steer ONLY the route this falls back to when the stored
 * geometry has degenerated and is being discarded anyway. A path the user drew
 * is RE-PROJECTED as nodes move, never RE-ROUTED: if someone drags a node onto
 * their hand-drawn edge, the edge stays where they put it. Re-routing it would
 * also rewrite stored points on every frame of an unrelated node's drag.
 */
export function preserveOrthogonalEdgePoints(
  points: IPoint[],
  sourcePoint: IPoint,
  targetPoint: IPoint,
  sourcePosition: Position,
  targetPosition: Position,
  obstacles: readonly ObstacleRect[] = []
): IPoint[] {
  if (isDegenerateRoute(sourcePoint, targetPoint)) {
    return getDegenerateRoute(sourcePoint, targetPoint)
  }

  const sourceAxis = getSegmentAxisForPosition(sourcePosition)
  const targetAxis = getSegmentAxisForPosition(targetPosition)
  const safePoints = routeOrthogonalPath(
    sourcePoint,
    targetPoint,
    sourcePosition,
    targetPosition,
    obstacles
  )
  const stubLength = getEffectiveStubLength(
    sourcePoint,
    targetPoint,
    sourcePosition,
    targetPosition
  )
  const minStubLength = getMinimumStubLength(
    sourcePoint,
    targetPoint,
    sourcePosition,
    targetPosition
  )
  // `points` still carries the endpoints from before the node moved, so we can
  // re-route the OLD geometry and measure the stubs the router would have drawn
  // then. A stub matching one of those is the router's; anything else is a length
  // the user dragged, and the two must behave differently as the node moves.
  //
  // Measure them, do not predict them: a Z's terminal segment runs to the centre
  // lane (half the gap), nothing like the smooth-step offset the router was
  // handed, so comparing against the offset mistakes the router's stubs for the
  // user's.
  const previousSafePoints =
    points.length >= 2
      ? routeOrthogonalPath(
          points[0],
          points[points.length - 1],
          sourcePosition,
          targetPosition,
          obstacles
        )
      : safePoints
  const previousSourceStub = getSourceStubLength(
    previousSafePoints,
    points[0] ?? sourcePoint,
    sourcePosition
  )
  const previousTargetStub = getTargetStubLength(
    previousSafePoints,
    points[points.length - 1] ?? targetPoint,
    targetPosition
  )
  // The stubs the router draws for where the nodes are NOW. Re-pinning a router
  // stub to these maps the old route onto the new one exactly, which is what
  // makes re-routing idempotent — feed a route back in and it does not budge.
  const safeSourceStub = getSourceStubLength(
    safePoints,
    sourcePoint,
    sourcePosition
  )
  const safeTargetStub = getTargetStubLength(
    safePoints,
    targetPoint,
    targetPosition
  )

  // How long a stub may get before it starves the far end. The preferred stub is
  // a preference, not a ceiling: with a 15px gap the router itself draws a 10px
  // stub, and clamping the user down to the "preferred" 5 would fight it.
  const facingGap = getFacingGap(
    sourcePoint,
    targetPoint,
    sourcePosition,
    targetPosition
  )
  const maxStubLength =
    facingGap !== null && facingGap > 0
      ? Math.max(minStubLength, facingGap - minStubLength)
      : Number.POSITIVE_INFINITY

  const isRouterStub = (offset: number, previous: number): boolean =>
    Number.isFinite(previous) && Math.abs(offset - previous) <= 1

  // A terminal segment no longer than the preferred stub is locked to its node:
  // it travels with the node rather than staying at an absolute coordinate.
  // Anything longer is a lane the user placed out in the open — leave it be.
  const isNodeLockedStub = (offset: number): boolean =>
    offset >= minStubLength - 1 && offset <= EDGES.STUB_LENGTH + 1

  // A stub the user pulled in to the node keeps their length. It gives way only
  // when the gap can no longer host it, and only as far as it must.
  const userStubLength = (offset: number): number =>
    Math.max(Math.min(offset, maxStubLength), minStubLength)

  if (
    stubsWouldOverlap(
      sourcePoint,
      targetPoint,
      sourcePosition,
      targetPosition,
      EDGES.MIN_STUB_LENGTH
    )
  ) {
    return getStubCollisionFallbackPoints(
      sourcePoint,
      targetPoint,
      sourcePosition,
      targetPosition
    )
  }

  const originalSegmentCount = Math.max(points.length - 1, 1)
  const safeSegmentCount = Math.max(safePoints.length - 1, 1)
  const minimumSegmentCount = getMinimumOrthogonalSegmentCount(
    sourcePoint,
    targetPoint,
    sourceAxis,
    targetAxis
  )

  if (originalSegmentCount < minimumSegmentCount) {
    return safePoints
  }

  let segmentCount = Math.max(
    originalSegmentCount,
    safeSegmentCount,
    minimumSegmentCount
  )
  while (getAlternatingAxis(sourceAxis, segmentCount - 1) !== targetAxis) {
    segmentCount += 1
  }

  const laneValues: number[] = [Number.NaN]
  for (let i = 1; i < segmentCount; i++) {
    const axis = getAlternatingAxis(sourceAxis, i - 1)
    laneValues[i] = getLaneValue(points, i, axis, targetPoint)
  }

  const safeLaneValues: number[] = [Number.NaN]
  for (let i = 1; i < segmentCount; i++) {
    const axis = getAlternatingAxis(sourceAxis, i - 1)
    safeLaneValues[i] = getLaneValue(safePoints, i, axis, targetPoint)
  }

  const srcAxisCoord0 = sourceAxis === "horizontal" ? points[0].x : points[0].y
  const srcAxisCoord1 =
    points.length > 1
      ? sourceAxis === "horizontal"
        ? points[1].x
        : points[1].y
      : srcAxisCoord0
  const srcStubOffset = Math.abs(srcAxisCoord1 - srcAxisCoord0)

  const targetLaneIndex = (() => {
    for (let i = segmentCount - 1; i >= 1; i--) {
      if (getAlternatingAxis(sourceAxis, i - 1) === targetAxis) return i
    }
    return 1
  })()

  const lastIdx = points.length - 1
  const tgtAxisCoordLast =
    targetAxis === "horizontal" ? points[lastIdx].x : points[lastIdx].y
  const tgtAxisCoordAtLane =
    targetLaneIndex < points.length
      ? targetAxis === "horizontal"
        ? points[targetLaneIndex].x
        : points[targetLaneIndex].y
      : tgtAxisCoordLast
  const tgtStubOffset = Math.abs(tgtAxisCoordLast - tgtAxisCoordAtLane)

  // The router's stub follows the router; the user's stub follows the user. A
  // stub that is neither (a long lane out in the open) stays where it was put.
  const sourceStubIsLocked =
    isRouterStub(srcStubOffset, previousSourceStub) ||
    isNodeLockedStub(srcStubOffset)
  const targetStubIsLocked =
    isRouterStub(tgtStubOffset, previousTargetStub) ||
    isNodeLockedStub(tgtStubOffset)

  let sourceStub = isRouterStub(srcStubOffset, previousSourceStub)
    ? safeSourceStub
    : userStubLength(srcStubOffset)
  let targetStub = isRouterStub(tgtStubOffset, previousTargetStub)
    ? safeTargetStub
    : userStubLength(tgtStubOffset)

  // The two stubs share ONE gap, so they have to be settled together: clamping
  // each on its own lets both keep a length that only fits if the other gives
  // way (two 30px stubs across a 50px gap), and the route ends up stair-stepping
  // through the sliver between them. When they cannot both be honoured, neither
  // wins — they split the gap, which is the route the router would have drawn.
  if (
    facingGap !== null &&
    facingGap > 0 &&
    sourceStubIsLocked &&
    targetStubIsLocked &&
    sourceStub + targetStub > facingGap
  ) {
    sourceStub = stubLength
    targetStub = stubLength
  }

  if (sourceStubIsLocked) {
    laneValues[1] = getStubExitCoord(sourcePosition, sourcePoint, sourceStub)
  }

  if (!isSourceLaneCompatible(sourcePosition, sourcePoint, laneValues[1])) {
    laneValues[1] = safeLaneValues[1]
  }

  // A Z-shaped route has ONE lane serving both stubs. Re-pinning it to the target
  // would overwrite what the source just pinned, landing the lane somewhere
  // neither end asked for. The source's claim wins; the joint clamp above already
  // guarantees the target keeps its own minimum.
  const targetOwnsItsOwnLane = targetLaneIndex !== 1 || !sourceStubIsLocked
  if (targetOwnsItsOwnLane && targetStubIsLocked) {
    laneValues[targetLaneIndex] = getStubExitCoord(
      targetPosition,
      targetPoint,
      targetStub
    )
  }

  // Two stub lanes within a grid cell of each other are one spine carrying a
  // rounding jog (an odd gap cannot split into two equal grid-multiple stubs).
  // Pull them onto a single grid lane so the route turns once instead of
  // stair-stepping through a sliver.
  if (sourceAxis === targetAxis && targetLaneIndex > 1) {
    const laneAxis = sourceAxis === "horizontal" ? "x" : "y"
    const sourceLane = laneValues[1]
    const targetLane = laneValues[targetLaneIndex]
    const spine = toCanvasGrid((sourceLane + targetLane) / 2)
    if (
      Math.abs(sourceLane - targetLane) <= CANVAS.SNAP_TO_GRID_PX &&
      laneClearsEndpoint(
        spine,
        laneAxis,
        sourcePoint,
        sourcePosition,
        minStubLength
      ) &&
      laneClearsEndpoint(
        spine,
        laneAxis,
        targetPoint,
        targetPosition,
        minStubLength
      )
    ) {
      laneValues[1] = spine
      laneValues[targetLaneIndex] = spine
    }
  }

  if (segmentCount >= 3 && points.length >= 3) {
    const perpCoord1 = sourceAxis === "horizontal" ? points[1].y : points[1].x
    const perpCoord2 = sourceAxis === "horizontal" ? points[2].y : points[2].x
    if (Math.abs(perpCoord1 - perpCoord2) <= 1) {
      laneValues[2] =
        sourceAxis === "horizontal" ? sourcePoint.y : sourcePoint.x
    }
  }

  let result = buildOrthogonalPathFromLanes(
    laneValues,
    segmentCount,
    sourcePoint,
    targetPoint,
    sourceAxis,
    targetAxis
  )

  // Below two points there is no penultimate point to reason about, and the
  // checks past here would read off the end of the array.
  if (result.length < 2) return safePoints

  if (
    !isTargetApproachCompatible(
      targetPosition,
      result[result.length - 2],
      targetPoint
    )
  ) {
    if (sourceAxis === targetAxis && points.length >= 6) {
      const stubExitCoord = getStubExitCoord(
        targetPosition,
        targetPoint,
        stubLength
      )
      const stubExitPoint =
        targetAxis === "horizontal"
          ? { x: stubExitCoord, y: targetPoint.y }
          : { x: targetPoint.x, y: stubExitCoord }
      const withStub = removeDuplicatePoints([
        ...result.slice(0, -1),
        stubExitPoint,
        targetPoint,
      ])
      if (
        isTargetApproachCompatible(
          targetPosition,
          withStub[withStub.length - 2],
          targetPoint
        )
      ) {
        result = withStub
      } else {
        laneValues[targetLaneIndex] = safeLaneValues[targetLaneIndex]
        result = buildOrthogonalPathFromLanes(
          laneValues,
          segmentCount,
          sourcePoint,
          targetPoint,
          sourceAxis,
          targetAxis
        )
      }
    } else {
      laneValues[targetLaneIndex] = safeLaneValues[targetLaneIndex]
      result = buildOrthogonalPathFromLanes(
        laneValues,
        segmentCount,
        sourcePoint,
        targetPoint,
        sourceAxis,
        targetAxis
      )
    }
  }

  result = collapseTinyOrthogonalDoglegs(
    result,
    EDGES.ORTHOGONAL_DOGLEG_TOLERANCE_PX
  )

  if (
    !isSourceLaneCompatible(
      sourcePosition,
      sourcePoint,
      getLaneValue(result, 1, getAlternatingAxis(sourceAxis, 0), targetPoint)
    ) ||
    !isTargetApproachCompatible(
      targetPosition,
      result[result.length - 2],
      targetPoint
    ) ||
    hasCollapsingSegments(result) ||
    hasReducedTerminalStub(
      result,
      sourcePoint,
      targetPoint,
      sourcePosition,
      targetPosition
    )
  ) {
    return safePoints
  }

  return removeRedundantLanes(
    pushLanesClearOfStubs(
      result,
      sourcePoint,
      targetPoint,
      sourcePosition,
      targetPosition,
      points
    ),
    getStubExitPoint(sourcePosition, sourcePoint, stubLength),
    getStubExitPoint(targetPosition, targetPoint, stubLength)
  )
}

export function getMarkerSegmentPath(
  points: IPoint[],
  offset: number,
  targetPosition: "top" | "bottom" | "left" | "right"
): string {
  if (points.length === 0) return ""

  const lastPoint = points[points.length - 1]
  // Round coordinates to whole pixels for pixel-perfect rendering
  const lastX = Math.round(lastPoint.x)
  const lastY = Math.round(lastPoint.y)
  let extendedX = lastX
  let extendedY = lastY
  switch (targetPosition) {
    case "top":
      extendedY = lastY + offset
      break
    case "bottom":
      extendedY = lastY - offset
      break
    case "left":
      extendedX = lastX + offset
      break
    case "right":
      extendedX = lastX - offset
      break
    default:
      break
  }

  return `M ${lastX} ${lastY} L ${extendedX} ${extendedY}`
}

export const getDefaultEdgeType = (
  diagramType: UMLDiagramType
): DiagramEdgeType => {
  switch (diagramType) {
    case "ClassDiagram":
      return "ClassUnidirectional"
    case "ActivityDiagram":
      return "ActivityControlFlow"

    case "UseCaseDiagram":
      return "UseCaseAssociation"
    case "ComponentDiagram":
      return "ComponentDependency"
    case "DeploymentDiagram":
      return "DeploymentAssociation"
    case "ObjectDiagram":
      return "ObjectLink"
    case "Flowchart":
      return "FlowChartFlowline"
    case "SyntaxTree":
      return "SyntaxTreeLink"
    case "ReachabilityGraph":
      return "ReachabilityGraphArc"
    case "BPMN":
      return "BPMNSequenceFlow"
    case "Sfc":
      return "SfcDiagramEdge"
    case "CommunicationDiagram":
      return "CommunicationLink"
    case "PetriNet":
      return "PetriNetArc"
    default:
      return "ClassUnidirectional"
  }
}

/**
 * Determines the appropriate connection line type based on the diagram type
 * @param diagramType - The type of diagram being rendered
 * @returns The corresponding ConnectionLineType
 */
export function getConnectionLineType(
  diagramType: UMLDiagramType
): ConnectionLineType {
  switch (diagramType) {
    case "UseCaseDiagram":
    case "SyntaxTree":
    case "PetriNet":
      return ConnectionLineType.Straight

    default:
      return ConnectionLineType.Step
  }
}
