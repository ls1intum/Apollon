import type { SerializedSolverInput } from "@/utils/geometry/edgeGeometryWorkerProtocol"
import type { RouteSetScore } from "@/utils/geometry/edgeGeometrySolver"
import { CANVAS, EDGES } from "@/utils/geometry/routingConstants"
import type { IPoint } from "@/edges/Connection"
import {
  EDGE_LABEL_CLEARANCE_PX,
  computeUseCaseLabelLayout,
  evaluateMiddleLabelLayout,
  estimateLabelWidth,
  rectsIntersect,
  type Rect,
} from "@/utils/geometry/edgeLabelLayout"
import { getEdgeEndLabelPlacements } from "@/utils/geometry/edgeEndLabelLayout"
import { compareLayoutId } from "./graph"
import type { DiagramLayoutEdgeLabels } from "./model"
import { measureSemanticComposition } from "./semanticQuality"
import type { DiagramLayoutPositions } from "./types"

export type LayoutMetrics = Readonly<{
  nodeOverlaps: number
  nodeOverlapPenetrationPx: number
  nodeClearanceViolations: number
  nodeClearanceDeficitPx: number
  labelNodeHits: number
  labelLineHits: number
  labelFitFailures: number
  labelLabelOverlaps: number
  semanticBackwardEdges: number
  semanticBackwardDistancePx: number
  hierarchyFanoutMaxOffsetPermille: number
  hierarchyFanoutTotalOffsetPermille: number
  hierarchySiblingSpreadPermille: number
  route: RouteSetScore
  displacementPx: number
  widthPx: number
  heightPx: number
  perimeterPx: number
  areaPx2: number
}>

const nodeSize = (
  node: SerializedSolverInput["nodes"][number]
): { width: number; height: number } => ({
  width: node.width ?? node.measured?.width ?? 0,
  height: node.height ?? node.measured?.height ?? 0,
})

const layoutBounds = (
  input: SerializedSolverInput,
  positions: DiagramLayoutPositions
) => {
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const node of input.nodes) {
    if (node.hidden) continue
    const position = positions[node.id] ?? node.position
    const size = nodeSize(node)
    minX = Math.min(minX, position.x)
    minY = Math.min(minY, position.y)
    maxX = Math.max(maxX, position.x + size.width)
    maxY = Math.max(maxY, position.y + size.height)
  }
  return {
    width: Math.max(0, maxX - minX),
    height: Math.max(0, maxY - minY),
  }
}

const nodeSeparation = (
  input: SerializedSolverInput,
  positions: DiagramLayoutPositions
) => {
  const visible = input.nodes.filter((node) => !node.hidden)
  let overlaps = 0
  let penetration = 0
  let clearanceViolations = 0
  let clearanceDeficit = 0
  for (let firstIndex = 0; firstIndex < visible.length; firstIndex++) {
    const first = visible[firstIndex]
    const firstPosition = positions[first.id] ?? first.position
    const firstSize = nodeSize(first)
    const firstRight = firstPosition.x + firstSize.width
    const firstBottom = firstPosition.y + firstSize.height
    for (
      let secondIndex = firstIndex + 1;
      secondIndex < visible.length;
      secondIndex++
    ) {
      const second = visible[secondIndex]
      const secondPosition = positions[second.id] ?? second.position
      const secondSize = nodeSize(second)
      const secondRight = secondPosition.x + secondSize.width
      const secondBottom = secondPosition.y + secondSize.height
      const overlapX =
        Math.min(firstRight, secondRight) -
        Math.max(firstPosition.x, secondPosition.x)
      const overlapY =
        Math.min(firstBottom, secondBottom) -
        Math.max(firstPosition.y, secondPosition.y)
      if (overlapX > 0 && overlapY > 0) {
        overlaps++
        penetration += Math.min(overlapX, overlapY)
        continue
      }
      if (overlapY > 0) {
        const horizontalGap = Math.max(
          secondPosition.x - firstRight,
          firstPosition.x - secondRight
        )
        const deficit = Math.max(0, EDGES.NODE_CLEARANCE_PX - horizontalGap)
        if (deficit > 0) clearanceViolations++
        clearanceDeficit += deficit
      } else if (overlapX > 0) {
        const verticalGap = Math.max(
          secondPosition.y - firstBottom,
          firstPosition.y - secondBottom
        )
        const deficit = Math.max(0, EDGES.NODE_CLEARANCE_PX - verticalGap)
        if (deficit > 0) clearanceViolations++
        clearanceDeficit += deficit
      }
    }
  }
  return { overlaps, penetration, clearanceViolations, clearanceDeficit }
}

const ORTHOGONAL_MIDDLE_LABEL_EDGE_TYPES = new Set([
  "ActivityControlFlow",
  "FlowChartFlowline",
  "ReachabilityGraphArc",
  "DeploymentAssociation",
  "BPMNSequenceFlow",
  "BPMNMessageFlow",
  "BPMNAssociationFlow",
  "BPMNDataAssociationFlow",
])
const STRAIGHT_MIDDLE_LABEL_EDGE_TYPES = new Set([
  "PetriNetArc",
  "UseCaseAssociation",
  "UseCaseInclude",
  "UseCaseExtend",
])
const END_LABEL_EDGE_TYPES = new Set([
  "ClassAggregation",
  "ClassInheritance",
  "ClassRealization",
  "ClassComposition",
  "ClassBidirectional",
  "ClassUnidirectional",
  "ClassDependency",
])

const inflateRect = (rect: Rect, margin: number): Rect => ({
  x: rect.x - margin,
  y: rect.y - margin,
  width: rect.width + 2 * margin,
  height: rect.height + 2 * margin,
})

const straightMiddleLabelBox = (
  text: string,
  measuredWidth: number | undefined,
  route: readonly IPoint[]
): Rect | undefined => {
  if (route.length < 2) return undefined
  const fontSize = 12
  const width = measuredWidth ?? estimateLabelWidth(text, fontSize)
  const height = fontSize * 1.2
  const placement = computeUseCaseLabelLayout(
    route[0],
    route[route.length - 1],
    15
  )
  const radians = (placement.rotation * Math.PI) / 180
  const rotatedWidth =
    Math.abs(width * Math.cos(radians)) + Math.abs(height * Math.sin(radians))
  const rotatedHeight =
    Math.abs(width * Math.sin(radians)) + Math.abs(height * Math.cos(radians))
  return inflateRect(
    {
      x: placement.x - rotatedWidth / 2,
      y: placement.y - rotatedHeight / 2,
      width: rotatedWidth,
      height: rotatedHeight,
    },
    EDGE_LABEL_CLEARANCE_PX
  )
}

const pointInsideRect = (point: IPoint, rect: Rect): boolean =>
  point.x >= rect.x &&
  point.x <= rect.x + rect.width &&
  point.y >= rect.y &&
  point.y <= rect.y + rect.height

/** Liang-Barsky clipping handles both orthogonal and straight-hook routes. */
const segmentIntersectsRect = (
  first: IPoint,
  second: IPoint,
  rect: Rect
): boolean => {
  if (pointInsideRect(first, rect) || pointInsideRect(second, rect)) return true
  const dx = second.x - first.x
  const dy = second.y - first.y
  let minimum = 0
  let maximum = 1
  const clip = (direction: number, distance: number): boolean => {
    if (direction === 0) return distance >= 0
    const ratio = distance / direction
    if (direction < 0) {
      if (ratio > maximum) return false
      minimum = Math.max(minimum, ratio)
    } else {
      if (ratio < minimum) return false
      maximum = Math.min(maximum, ratio)
    }
    return true
  }
  return (
    clip(-dx, first.x - rect.x) &&
    clip(dx, rect.x + rect.width - first.x) &&
    clip(-dy, first.y - rect.y) &&
    clip(dy, rect.y + rect.height - first.y) &&
    minimum <= maximum
  )
}

const polylineIntersectsRect = (
  points: readonly IPoint[],
  rect: Rect
): boolean => {
  for (let index = 1; index < points.length; index++)
    if (segmentIntersectsRect(points[index - 1], points[index], rect))
      return true
  return false
}

const endLabelBox = (
  text: string,
  measuredWidth: number | undefined,
  x: number,
  y: number,
  textAnchor: "start" | "middle" | "end"
): Rect => {
  const fontSize = 16
  const width = measuredWidth ?? estimateLabelWidth(text, fontSize)
  const left =
    textAnchor === "start"
      ? x
      : textAnchor === "end"
        ? x - width
        : x - width / 2
  return inflateRect(
    {
      x: left,
      y: y - fontSize,
      width,
      height: fontSize * 1.2,
    },
    EDGE_LABEL_CLEARANCE_PX
  )
}

const endLabelBoxes = (
  labels: DiagramLayoutEdgeLabels,
  route: readonly IPoint[]
): Array<Readonly<{ box: Rect; end: "source" | "target" }>> => {
  if (route.length < 2) return []
  const endpointLabels = getEdgeEndLabelPlacements({
    activePoints: route,
    source: route[0],
    target: route[route.length - 1],
    sourcePosition: "right",
    targetPosition: "left",
  })
  const boxes: Array<Readonly<{ box: Rect; end: "source" | "target" }>> = []
  const add = (
    text: string | undefined,
    measuredWidth: number | undefined,
    x: number,
    y: number,
    textAnchor: "start" | "middle" | "end",
    end: "source" | "target"
  ) => {
    if (text)
      boxes.push({
        box: endLabelBox(text, measuredWidth, x, y, textAnchor),
        end,
      })
  }
  add(
    labels.sourceRole,
    labels.sourceRoleWidth,
    endpointLabels.source.roleX,
    endpointLabels.source.roleY,
    endpointLabels.source.roleTextAnchor,
    "source"
  )
  add(
    labels.sourceMultiplicity,
    labels.sourceMultiplicityWidth,
    endpointLabels.source.multiplicityX,
    endpointLabels.source.multiplicityY,
    endpointLabels.source.multiplicityTextAnchor,
    "source"
  )
  add(
    labels.targetRole,
    labels.targetRoleWidth,
    endpointLabels.target.roleX,
    endpointLabels.target.roleY,
    endpointLabels.target.roleTextAnchor,
    "target"
  )
  add(
    labels.targetMultiplicity,
    labels.targetMultiplicityWidth,
    endpointLabels.target.multiplicityX,
    endpointLabels.target.multiplicityY,
    endpointLabels.target.multiplicityTextAnchor,
    "target"
  )
  return boxes
}

const edgeLabelCollisions = (
  input: SerializedSolverInput,
  positions: DiagramLayoutPositions,
  routeById: Readonly<Record<string, readonly IPoint[]>>,
  edgeLabels: Readonly<Record<string, DiagramLayoutEdgeLabels>>
) => {
  const nodesWithRects = input.nodes
    .filter((node) => !node.hidden)
    .map((node) => {
      const position = positions[node.id] ?? node.position
      const size = nodeSize(node)
      return { id: node.id, rect: { ...position, ...size } }
    })
  const nodeRects = nodesWithRects.map(({ rect }) => rect)
  let nodeHits = 0
  let lineHits = 0
  let fitFailures = 0
  const boxes: Rect[] = []
  for (const edge of input.edges) {
    const labels = edgeLabels[edge.id]
    const route = routeById[edge.id]
    if (!labels || !route) continue
    if (
      labels.middle &&
      ORTHOGONAL_MIDDLE_LABEL_EDGE_TYPES.has(edge.type ?? "")
    ) {
      const evaluation = evaluateMiddleLabelLayout({
        renderPoints: [...route],
        labelText: labels.middle,
        fontSize: 12,
        measuredWidth: labels.middleWidth,
        nodeRects,
        neighborGeometry: Object.entries(routeById)
          .filter(([id]) => id !== edge.id)
          .map(([, points]) => [...points]),
      })
      nodeHits += evaluation.cost[0]
      lineHits += evaluation.cost[1]
      fitFailures += evaluation.cost[2]
      boxes.push(evaluation.box)
    } else if (
      labels.middle &&
      STRAIGHT_MIDDLE_LABEL_EDGE_TYPES.has(edge.type ?? "") &&
      !(edge.type === "PetriNetArc" && labels.middle === "1")
    ) {
      const box = straightMiddleLabelBox(
        labels.middle,
        labels.middleWidth,
        route
      )
      if (box) {
        nodeHits += nodeRects.filter((rect) => rectsIntersect(box, rect)).length
        lineHits += Object.entries(routeById).filter(
          ([id, points]) =>
            id !== edge.id && polylineIntersectsRect(points, box)
        ).length
        boxes.push(box)
      }
    }
    if (!END_LABEL_EDGE_TYPES.has(edge.type ?? "")) continue
    for (const { box, end } of endLabelBoxes(labels, route)) {
      const ownNodeId = end === "source" ? edge.source : edge.target
      nodeHits += nodesWithRects.filter(
        ({ id, rect }) => id !== ownNodeId && rectsIntersect(box, rect)
      ).length
      for (const [otherId, points] of Object.entries(routeById))
        if (otherId !== edge.id && polylineIntersectsRect(points, box))
          lineHits++
      boxes.push(box)
    }
  }
  let labelOverlaps = 0
  for (let first = 0; first < boxes.length; first++)
    for (let second = first + 1; second < boxes.length; second++)
      if (rectsIntersect(boxes[first], boxes[second])) labelOverlaps++
  return { nodeHits, lineHits, fitFailures, labelOverlaps }
}

export const measureLayout = (
  input: SerializedSolverInput,
  positions: DiagramLayoutPositions,
  route: RouteSetScore,
  routeById: Readonly<Record<string, readonly IPoint[]>>,
  edgeLabels: Readonly<Record<string, DiagramLayoutEdgeLabels>>
): LayoutMetrics => {
  const separation = nodeSeparation(input, positions)
  const semantic = measureSemanticComposition(input, positions)
  const labels = edgeLabelCollisions(input, positions, routeById, edgeLabels)
  const bounds = layoutBounds(input, positions)
  const displacementPx = input.nodes.reduce((sum, node) => {
    if (node.hidden) return sum
    const position = positions[node.id] ?? node.position
    return (
      sum +
      Math.abs(position.x - node.position.x) +
      Math.abs(position.y - node.position.y)
    )
  }, 0)
  return {
    nodeOverlaps: separation.overlaps,
    nodeOverlapPenetrationPx: separation.penetration,
    nodeClearanceViolations: separation.clearanceViolations,
    nodeClearanceDeficitPx: separation.clearanceDeficit,
    labelNodeHits: labels.nodeHits,
    labelLineHits: labels.lineHits,
    labelFitFailures: labels.fitFailures,
    labelLabelOverlaps: labels.labelOverlaps,
    semanticBackwardEdges: semantic.backwardEdges,
    semanticBackwardDistancePx: semantic.backwardDistancePx,
    hierarchyFanoutMaxOffsetPermille: semantic.hierarchyFanoutMaxOffsetPermille,
    hierarchyFanoutTotalOffsetPermille:
      semantic.hierarchyFanoutTotalOffsetPermille,
    hierarchySiblingSpreadPermille: semantic.hierarchySiblingSpreadPermille,
    route,
    displacementPx,
    widthPx: bounds.width,
    heightPx: bounds.height,
    perimeterPx: bounds.width + bounds.height,
    areaPx2: bounds.width * bounds.height,
  }
}

export const layoutMetricValues = (
  metrics: LayoutMetrics
): readonly number[] => [
  metrics.nodeOverlaps,
  metrics.route.hardInvalidity,
  metrics.nodeOverlapPenetrationPx,
  metrics.labelNodeHits,
  // Topology and legibility precede coordinate-level compaction. Acceptance
  // applies explicit route-cost and footprint guards to these structural wins,
  // so this ordering cannot buy an unbounded detour.
  metrics.route.crossings,
  metrics.nodeClearanceViolations,
  metrics.labelLabelOverlaps + metrics.labelLineHits + metrics.labelFitFailures,
  metrics.semanticBackwardEdges,
  metrics.semanticBackwardDistancePx,
  metrics.route.straightBroken,
  // Reward only UML structure we can identify faithfully. General geometric
  // symmetry and node distribution are intentionally absent: both are easy to
  // improve while separating semantically related classes.
  metrics.hierarchyFanoutMaxOffsetPermille,
  metrics.hierarchyFanoutTotalOffsetPermille,
  metrics.hierarchySiblingSpreadPermille,
  // The canonical router owns the calibrated trade-off between travel, bends,
  // overlaps, crowding, and shared-side balance.
  metrics.route.weightedCost,
  metrics.route.proximityPx,
  metrics.route.bends,
  metrics.route.length,
  metrics.labelLabelOverlaps,
  metrics.labelLineHits,
  metrics.labelFitFailures,
  metrics.nodeClearanceDeficitPx,
  metrics.route.maxSideGapImbalancePx,
  metrics.route.totalSideGapImbalancePx,
  metrics.route.maxCornerJamPermille,
  metrics.route.totalCornerJamPermille,
  metrics.perimeterPx,
  metrics.areaPx2,
  metrics.displacementPx,
]

export const compareMetricValues = (
  left: readonly number[],
  right: readonly number[]
): number => {
  for (let index = 0; index < Math.max(left.length, right.length); index++) {
    const difference = (left[index] ?? 0) - (right[index] ?? 0)
    if (difference !== 0) return difference
  }
  return 0
}

export const canonicalPositionSignature = (
  positions: DiagramLayoutPositions
): string =>
  Object.keys(positions)
    .sort(compareLayoutId)
    .map((id) => `${id}\u0000${positions[id].x}\u0000${positions[id].y}`)
    .join("\u0001")

const withinFootprintGuard = (
  baseline: LayoutMetrics,
  candidate: LayoutMetrics
): boolean =>
  candidate.areaPx2 <= Math.max(baseline.areaPx2 * 1.5, baseline.areaPx2) &&
  candidate.widthPx <= Math.max(baseline.widthPx * 1.75, baseline.widthPx) &&
  candidate.heightPx <= Math.max(baseline.heightPx * 1.75, baseline.heightPx)

const withinCompositionFootprintGuard = (
  baseline: LayoutMetrics,
  candidate: LayoutMetrics
): boolean =>
  candidate.areaPx2 <= Math.max(baseline.areaPx2 * 1.1, baseline.areaPx2) &&
  candidate.widthPx <= Math.max(baseline.widthPx * 1.1, baseline.widthPx) &&
  candidate.heightPx <= Math.max(baseline.heightPx * 1.1, baseline.heightPx)

/**
 * Ordering and acceptance are deliberately separate. Arrange only commits a
 * material improvement over the current drawing, never a merely different one.
 */
export const isMaterialLayoutImprovement = (
  baseline: LayoutMetrics,
  candidate: LayoutMetrics
): boolean => {
  const baselineValues = layoutMetricValues(baseline)
  const candidateValues = layoutMetricValues(candidate)
  if (compareMetricValues(candidateValues, baselineValues) >= 0) return false

  const removesHardDefect =
    candidate.nodeOverlaps < baseline.nodeOverlaps ||
    candidate.route.hardInvalidity < baseline.route.hardInvalidity ||
    candidate.labelNodeHits < baseline.labelNodeHits
  const doesNotTradeHardDefects =
    candidate.nodeOverlaps <= baseline.nodeOverlaps &&
    candidate.route.hardInvalidity <= baseline.route.hardInvalidity &&
    candidate.labelNodeHits <= baseline.labelNodeHits
  if (removesHardDefect && doesNotTradeHardDefects) return true
  if (!doesNotTradeHardDefects) return false
  if (!withinFootprintGuard(baseline, candidate)) return false

  const withinRouteCostFactor = (factor: number): boolean =>
    candidate.route.weightedCost <= baseline.route.weightedCost * factor
  const doesNotAddCrossings =
    candidate.route.crossings <= baseline.route.crossings
  const baselineLabelDefects =
    baseline.labelLabelOverlaps +
    baseline.labelLineHits +
    baseline.labelFitFailures
  const candidateLabelDefects =
    candidate.labelLabelOverlaps +
    candidate.labelLineHits +
    candidate.labelFitFailures
  const doesNotAddLabelDefects = candidateLabelDefects <= baselineLabelDefects
  const doesNotWorsenSemanticFlow =
    candidate.semanticBackwardEdges <= baseline.semanticBackwardEdges &&
    (candidate.semanticBackwardEdges < baseline.semanticBackwardEdges ||
      candidate.semanticBackwardDistancePx <=
        baseline.semanticBackwardDistancePx)
  const doesNotBreakStraightEdges =
    candidate.route.straightBroken <= baseline.route.straightBroken
  const crossingClearanceGuard =
    candidate.nodeClearanceViolations <= baseline.nodeClearanceViolations + 1 &&
    candidate.nodeClearanceDeficitPx <=
      baseline.nodeClearanceDeficitPx + CANVAS.SNAP_TO_GRID_PX
  const improvesSemanticFlow =
    candidate.semanticBackwardEdges < baseline.semanticBackwardEdges ||
    (candidate.semanticBackwardEdges === baseline.semanticBackwardEdges &&
      candidate.semanticBackwardDistancePx + CANVAS.SNAP_TO_GRID_PX <=
        baseline.semanticBackwardDistancePx)
  const materialBendReduction = Math.max(
    2,
    Math.ceil(baseline.route.bends * 0.1)
  )
  const doesNotWorsenHierarchyCentering =
    candidate.hierarchyFanoutMaxOffsetPermille <=
      baseline.hierarchyFanoutMaxOffsetPermille &&
    candidate.hierarchyFanoutTotalOffsetPermille <=
      baseline.hierarchyFanoutTotalOffsetPermille
  const doesNotWorsenSiblingGrouping =
    candidate.hierarchySiblingSpreadPermille <=
    baseline.hierarchySiblingSpreadPermille
  const materiallyImprovesHierarchyCentering =
    (candidate.hierarchyFanoutMaxOffsetPermille + 250 <=
      baseline.hierarchyFanoutMaxOffsetPermille ||
      (baseline.hierarchyFanoutTotalOffsetPermille >= 100 &&
        candidate.hierarchyFanoutTotalOffsetPermille + 100 <=
          baseline.hierarchyFanoutTotalOffsetPermille &&
        candidate.hierarchyFanoutTotalOffsetPermille * 5 <=
          baseline.hierarchyFanoutTotalOffsetPermille * 4)) &&
    doesNotWorsenSiblingGrouping
  const materiallyImprovesSiblingGrouping =
    baseline.hierarchySiblingSpreadPermille >= 100 &&
    candidate.hierarchySiblingSpreadPermille + 100 <=
      baseline.hierarchySiblingSpreadPermille &&
    candidate.hierarchySiblingSpreadPermille * 5 <=
      baseline.hierarchySiblingSpreadPermille * 4 &&
    doesNotWorsenHierarchyCentering
  const compositionClearanceGuard =
    candidate.nodeClearanceViolations <= baseline.nodeClearanceViolations &&
    candidate.nodeClearanceDeficitPx <= baseline.nodeClearanceDeficitPx

  return (
    (candidate.nodeClearanceViolations < baseline.nodeClearanceViolations &&
      doesNotAddCrossings &&
      withinRouteCostFactor(1.1)) ||
    (candidate.nodeClearanceViolations === baseline.nodeClearanceViolations &&
      candidate.nodeClearanceDeficitPx + CANVAS.SNAP_TO_GRID_PX <=
        baseline.nodeClearanceDeficitPx &&
      doesNotAddCrossings &&
      withinRouteCostFactor(1.1)) ||
    (candidate.route.crossings < baseline.route.crossings &&
      crossingClearanceGuard &&
      doesNotAddLabelDefects &&
      doesNotWorsenSemanticFlow &&
      doesNotBreakStraightEdges &&
      withinRouteCostFactor(1.25)) ||
    (candidateLabelDefects < baselineLabelDefects &&
      doesNotAddCrossings &&
      doesNotWorsenSemanticFlow &&
      doesNotBreakStraightEdges &&
      withinRouteCostFactor(1.1)) ||
    (improvesSemanticFlow &&
      doesNotAddCrossings &&
      doesNotAddLabelDefects &&
      doesNotBreakStraightEdges &&
      withinRouteCostFactor(1.15)) ||
    (candidate.route.straightBroken < baseline.route.straightBroken &&
      doesNotAddCrossings &&
      withinRouteCostFactor(1.1)) ||
    ((materiallyImprovesHierarchyCentering ||
      materiallyImprovesSiblingGrouping) &&
      compositionClearanceGuard &&
      doesNotAddCrossings &&
      doesNotAddLabelDefects &&
      doesNotWorsenSemanticFlow &&
      doesNotBreakStraightEdges &&
      withinCompositionFootprintGuard(baseline, candidate) &&
      withinRouteCostFactor(1.05)) ||
    candidate.route.bends + materialBendReduction <= baseline.route.bends ||
    candidate.route.weightedCost <= baseline.route.weightedCost * 0.9 ||
    candidate.areaPx2 <= baseline.areaPx2 * 0.8 ||
    candidate.perimeterPx <= baseline.perimeterPx * 0.8
  )
}
