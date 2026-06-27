import { EDGES, INTERFACE } from "@/constants"
import { IPoint, pointsToSvgPath } from "@/edges/Connection"
import { DiagramEdgeType, UMLDiagramType } from "@/typings"
import {
  Position,
  Rect,
  XYPosition,
  ConnectionLineType,
  getSmoothStepPath,
} from "@xyflow/react"

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

const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value))

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
  // Named handles are the visible drag targets and are rendered by every node.
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
 * hopped (line jumps are orthogonal-only, matching mxGraph/ELK/yFiles).
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

const getSafeOrthogonalPathPoints = (
  sourcePoint: IPoint,
  targetPoint: IPoint,
  sourcePosition: Position,
  targetPosition: Position
): IPoint[] => {
  const [safePath] = getSmoothStepPath({
    sourceX: sourcePoint.x,
    sourceY: sourcePoint.y,
    sourcePosition,
    targetX: targetPoint.x,
    targetY: targetPoint.y,
    targetPosition,
    borderRadius: EDGES.STEP_BORDER_RADIUS,
    offset: 30,
  })

  return removeDuplicatePoints(parseSvgPath(simplifySvgPath(safePath)))
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

    const bridgeY =
      sourcePoint.y !== targetPoint.y
        ? Math.round((sourcePoint.y + targetPoint.y) / 2)
        : sourcePoint.y <= targetPoint.y
          ? Math.min(sourcePoint.y, targetPoint.y) - EDGES.STUB_LENGTH
          : Math.max(sourcePoint.y, targetPoint.y) + EDGES.STUB_LENGTH
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

  const bridgeX =
    sourcePoint.x !== targetPoint.x
      ? Math.round((sourcePoint.x + targetPoint.x) / 2)
      : sourcePoint.x <= targetPoint.x
        ? Math.min(sourcePoint.x, targetPoint.x) - EDGES.STUB_LENGTH
        : Math.max(sourcePoint.x, targetPoint.x) + EDGES.STUB_LENGTH
  return removeDuplicatePoints([
    sourcePoint,
    sourceStub,
    { x: bridgeX, y: sourceStub.y },
    { x: bridgeX, y: targetStub.y },
    targetStub,
    targetPoint,
  ])
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
 * overlap or leave no room between them. This catches the "narrow U" case —
 * where the two arms of a U-shape almost touch — before the geometry has
 * actually inverted (which hasCollapsingSegments catches too late).
 *
 * Only applies to facing-stub configurations where both stubs exit into the
 * same space and can collide. Diverging pairs are handled by later validation.
 */
export const stubsWouldOverlap = (
  sourcePoint: IPoint,
  targetPoint: IPoint,
  sourcePosition: Position,
  targetPosition: Position,
  stubLength: number
): boolean => {
  if (sourcePosition === Position.Right && targetPosition === Position.Left) {
    return (
      sourcePoint.x < targetPoint.x &&
      sourcePoint.x + stubLength >= targetPoint.x - stubLength
    )
  }
  if (sourcePosition === Position.Left && targetPosition === Position.Right) {
    return (
      sourcePoint.x > targetPoint.x &&
      sourcePoint.x - stubLength <= targetPoint.x + stubLength
    )
  }
  if (sourcePosition === Position.Bottom && targetPosition === Position.Top) {
    return (
      sourcePoint.y < targetPoint.y &&
      sourcePoint.y + stubLength >= targetPoint.y - stubLength
    )
  }
  if (sourcePosition === Position.Top && targetPosition === Position.Bottom) {
    return (
      sourcePoint.y > targetPoint.y &&
      sourcePoint.y - stubLength <= targetPoint.y + stubLength
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

const hasReducedTerminalStub = (
  points: IPoint[],
  sourcePoint: IPoint,
  targetPoint: IPoint,
  sourcePosition: Position,
  targetPosition: Position
): boolean =>
  getSourceStubLength(points, sourcePoint, sourcePosition) <
    EDGES.STUB_LENGTH ||
  getTargetStubLength(points, targetPoint, targetPosition) < EDGES.STUB_LENGTH

const hasArmCollapse = (points: IPoint[], proximityPx: number): boolean => {
  if (points.length < 4) return false

  for (let i = 0; i < points.length - 1; i++) {
    const aStart = points[i]
    const aEnd = points[i + 1]
    const aIsH = aStart.y === aEnd.y
    const aIsV = aStart.x === aEnd.x
    if (!aIsH && !aIsV) continue

    for (let j = i + 2; j < points.length - 1; j++) {
      const bStart = points[j]
      const bEnd = points[j + 1]
      const bIsH = bStart.y === bEnd.y
      const bIsV = bStart.x === bEnd.x

      if (aIsH && bIsH && Math.abs(aStart.y - bStart.y) <= proximityPx) {
        const aMinX = Math.min(aStart.x, aEnd.x)
        const aMaxX = Math.max(aStart.x, aEnd.x)
        const bMinX = Math.min(bStart.x, bEnd.x)
        const bMaxX = Math.max(bStart.x, bEnd.x)
        if (Math.max(aMinX, bMinX) < Math.min(aMaxX, bMaxX)) return true
      }

      if (aIsV && bIsV && Math.abs(aStart.x - bStart.x) <= proximityPx) {
        const aMinY = Math.min(aStart.y, aEnd.y)
        const aMaxY = Math.max(aStart.y, aEnd.y)
        const bMinY = Math.min(bStart.y, bEnd.y)
        const bMaxY = Math.max(bStart.y, bEnd.y)
        if (Math.max(aMinY, bMinY) < Math.min(aMaxY, bMaxY)) return true
      }
    }
  }

  return false
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
    ) ||
    hasArmCollapse(sanitized, EDGES.ORTHOGONAL_ARM_OVERLAP_PX) ||
    stubsWouldOverlap(
      sourcePoint,
      targetPoint,
      sourcePosition,
      targetPosition,
      EDGES.STUB_LENGTH
    )
  )
}

export function normalizeOrthogonalEdgePoints(
  points: IPoint[],
  sourcePoint: IPoint,
  targetPoint: IPoint,
  sourcePosition: Position,
  targetPosition: Position
): IPoint[] {
  const hasStubCollision = stubsWouldOverlap(
    sourcePoint,
    targetPoint,
    sourcePosition,
    targetPosition,
    EDGES.STUB_LENGTH
  )
  const fallback = hasStubCollision
    ? getStubCollisionFallbackPoints(
        sourcePoint,
        targetPoint,
        sourcePosition,
        targetPosition
      )
    : getSafeOrthogonalPathPoints(
        sourcePoint,
        targetPoint,
        sourcePosition,
        targetPosition
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
    hasArmCollapse(sanitized, EDGES.ORTHOGONAL_ARM_OVERLAP_PX) ||
    hasStubCollision
  ) {
    return fallback
  }

  const normalized = preserveOrthogonalEdgePoints(
    sanitized,
    sourcePoint,
    targetPoint,
    sourcePosition,
    targetPosition
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

  // When a release is invalid *because the user dragged the two parallel arms
  // of a U together (or past each other)*, that is a deliberate "merge the U"
  // gesture, not a bad drag — collapse the released geometry rather than
  // snapping back to the pre-drag wide route. normalizeOrthogonalEdgePoints
  // already routes overlapping input to the clean safe path and re-validates
  // stubs, so any other invalidity still falls back safely.
  const sanitized = sanitizeReleasedPoints(
    releasedPoints,
    sourcePoint,
    targetPoint
  )
  const armOverlap = hasArmCollapse(sanitized, EDGES.ORTHOGONAL_ARM_OVERLAP_PX)
  const pointsToNormalize =
    invalid && !armOverlap ? lastValidPoints : releasedPoints

  return normalizeOrthogonalEdgePoints(
    pointsToNormalize,
    sourcePoint,
    targetPoint,
    sourcePosition,
    targetPosition
  )
}
export function preserveOrthogonalEdgePoints(
  points: IPoint[],
  sourcePoint: IPoint,
  targetPoint: IPoint,
  sourcePosition: Position,
  targetPosition: Position
): IPoint[] {
  const sourceAxis = getSegmentAxisForPosition(sourcePosition)
  const targetAxis = getSegmentAxisForPosition(targetPosition)
  const safePoints = getSafeOrthogonalPathPoints(
    sourcePoint,
    targetPoint,
    sourcePosition,
    targetPosition
  )

  if (
    stubsWouldOverlap(
      sourcePoint,
      targetPoint,
      sourcePosition,
      targetPosition,
      EDGES.STUB_LENGTH
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
  if (Math.abs(srcStubOffset - EDGES.STUB_LENGTH) <= 1) {
    laneValues[1] = getStubExitCoord(
      sourcePosition,
      sourcePoint,
      EDGES.STUB_LENGTH
    )
  }

  if (!isSourceLaneCompatible(sourcePosition, sourcePoint, laneValues[1])) {
    laneValues[1] = safeLaneValues[1]
  }

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
  if (Math.abs(tgtStubOffset - EDGES.STUB_LENGTH) <= 1) {
    laneValues[targetLaneIndex] = getStubExitCoord(
      targetPosition,
      targetPoint,
      EDGES.STUB_LENGTH
    )
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
        EDGES.STUB_LENGTH
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
    ) ||
    hasArmCollapse(result, EDGES.ORTHOGONAL_ARM_OVERLAP_PX)
  ) {
    return safePoints
  }

  return result
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
