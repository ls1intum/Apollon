import {
  computeAllEdgeGeometry,
  type EdgeSolveCacheEntry,
} from "@/utils/geometry/edgeGeometrySolver"
import {
  deserializeSolverInput,
  type SerializedInternalSolverNode,
  type SerializedSolverInput,
  type SerializedSolverNode,
} from "@/utils/geometry/edgeGeometryWorkerProtocol"
import { CANVAS } from "@/utils/geometry/routingConstants"
import {
  generatePlacementCandidates,
  swapAdjacentLayerNodes,
  type DiagramPlacementCandidate,
} from "./placementGenerator"
import {
  canonicalPositionSignature,
  compareMetricValues,
  isMaterialLayoutImprovement,
  layoutMetricValues,
  measureLayout,
  type LayoutMetrics,
} from "./objective"
import type { DiagramLayoutPosition, DiagramLayoutPositions } from "./types"
import type { DiagramLayoutEdgeLabels, DiagramLayoutSnapshot } from "./model"
import { getLayoutSolveBudget } from "./solverBudget"

export type ScoredDiagramLayout = Readonly<{
  candidate: string
  positions: DiagramLayoutPositions
  score: readonly number[]
}>

const snap = (value: number): number =>
  Math.round(value / CANVAS.SNAP_TO_GRID_PX) * CANVAS.SNAP_TO_GRID_PX

const nodeSize = (
  node: Pick<SerializedSolverNode, "width" | "height" | "measured">
): { width: number; height: number } => ({
  width: node.width ?? node.measured?.width ?? 0,
  height: node.height ?? node.measured?.height ?? 0,
})

const bounds = (
  nodes: readonly SerializedSolverNode[],
  positions: DiagramLayoutPositions
) => {
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const node of nodes) {
    if (node.hidden) continue
    const position = positions[node.id] ?? node.position
    const { width, height } = nodeSize(node)
    minX = Math.min(minX, position.x)
    minY = Math.min(minY, position.y)
    maxX = Math.max(maxX, position.x + width)
    maxY = Math.max(maxY, position.y + height)
  }
  return { minX, minY, maxX, maxY }
}

/** Anchor a proposal around the current diagram centre before snapping. This
 * keeps the user's viewport meaningful without turning Arrange into Fit View. */
export const centerAndSnapLayout = (
  nodes: readonly SerializedSolverNode[],
  proposed: DiagramLayoutPositions
): DiagramLayoutPositions => {
  const currentPositions = Object.fromEntries(
    nodes.map((node) => [node.id, node.position])
  )
  const current = bounds(nodes, currentPositions)
  const next = bounds(nodes, proposed)
  const dx = snap((current.minX + current.maxX - next.minX - next.maxX) / 2)
  const dy = snap((current.minY + current.maxY - next.minY - next.maxY) / 2)
  return Object.fromEntries(
    nodes.map((node) => {
      if (node.hidden) return [node.id, { ...node.position }]
      const position = proposed[node.id] ?? node.position
      return [
        node.id,
        {
          x: snap(position.x + dx),
          y: snap(position.y + dy),
        },
      ]
    })
  )
}

const withPosition = <T extends SerializedSolverNode>(
  node: T,
  position: DiagramLayoutPosition
): T => ({ ...node, position: { ...position } })

export const applyPositionsToSolverInput = (
  input: SerializedSolverInput,
  positions: DiagramLayoutPositions
): SerializedSolverInput => {
  const nodes = input.nodes.map((node) =>
    withPosition(node, positions[node.id] ?? node.position)
  )
  const nodeLookup = input.nodeLookup.map(
    ([id, node]): [string, SerializedInternalSolverNode] => {
      const position = positions[id] ?? node.position
      return [
        id,
        {
          ...withPosition(node, position),
          positionAbsolute: { ...position },
        },
      ]
    }
  )
  return { ...input, nodes, nodeLookup, previous: undefined }
}

const evaluateLayoutCandidate = (
  input: SerializedSolverInput,
  positions: DiagramLayoutPositions,
  edgeLabels: Readonly<Record<string, DiagramLayoutEdgeLabels>>,
  sourceCache?: ReadonlyMap<string, EdgeSolveCacheEntry>
): Readonly<{
  metrics: LayoutMetrics
  score: readonly number[]
  signature: string
  solveCache: ReadonlyMap<string, EdgeSolveCacheEntry>
}> => {
  const candidateInput = applyPositionsToSolverInput(input, positions)
  const solverInput = deserializeSolverInput(candidateInput)
  const solveCache = new Map(sourceCache)
  const { routeById, score: routeScore } = computeAllEdgeGeometry({
    ...solverInput,
    solveCache,
  })
  const metrics = measureLayout(
    input,
    positions,
    routeScore,
    routeById,
    edgeLabels
  )
  return {
    metrics,
    score: layoutMetricValues(metrics),
    signature: canonicalPositionSignature(positions),
    solveCache,
  }
}

export const scoreLayoutCandidate = (
  snapshot: DiagramLayoutSnapshot,
  positions: DiagramLayoutPositions
): readonly number[] =>
  evaluateLayoutCandidate(snapshot.solver, positions, snapshot.edgeLabels).score

export type DiagramPlacementGenerator = (
  input: SerializedSolverInput
) => readonly DiagramPlacementCandidate[]

/**
 * Keep topology diversity when only a subset can afford exact routing. Stable
 * layered views cover the two primary axes; a structural (radial/tree) seed is
 * preferred over a second ordering of an axis already represented.
 */
export const shortlistPlacementCandidates = (
  candidates: readonly DiagramPlacementCandidate[],
  limit: number
): DiagramPlacementCandidate[] => {
  if (candidates.length <= limit) return [...candidates]
  if (limit <= 0) return []

  const selected: DiagramPlacementCandidate[] = []
  const take = (candidate: DiagramPlacementCandidate | undefined) => {
    if (candidate && !selected.includes(candidate) && selected.length < limit)
      selected.push(candidate)
  }
  const structural = candidates.find(
    (candidate) =>
      candidate.id.includes("radial") || candidate.id.includes("tree")
  )
  if (limit === 1)
    take(
      structural ??
        candidates.find((candidate) => candidate.id === "down-current")
    )
  take(candidates.find((candidate) => candidate.id === "down-stable"))
  if (limit === 2 && structural) take(structural)
  else {
    take(candidates.find((candidate) => candidate.id === "right-stable"))
    take(structural)
  }
  for (const candidate of candidates) take(candidate)
  return selected
}

export const solveDiagramLayout = async (
  snapshot: DiagramLayoutSnapshot,
  generate: DiagramPlacementGenerator = generatePlacementCandidates,
  onExactEvaluation?: () => void
): Promise<ScoredDiagramLayout> => {
  const { solver: input, edgeLabels } = snapshot
  const currentPositions = Object.fromEntries(
    input.nodes.map((node) => [node.id, { ...node.position }])
  )
  onExactEvaluation?.()
  const baselineEvaluation = evaluateLayoutCandidate(
    input,
    currentPositions,
    edgeLabels
  )
  const baseline: ScoredDiagramLayout = {
    candidate: "current",
    positions: currentPositions,
    score: baselineEvaluation.score,
  }
  let bestAccepted = {
    scored: baseline,
    signature: baselineEvaluation.signature,
  }
  let bestGenerated:
    | Readonly<{
        candidate: DiagramPlacementCandidate
        scored: ScoredDiagramLayout
        score: readonly number[]
        metrics: LayoutMetrics
        signature: string
        solveCache: ReadonlyMap<string, EdgeSolveCacheEntry>
      }>
    | undefined

  const evaluationBySignature = new Map([
    [baselineEvaluation.signature, baselineEvaluation],
  ])
  const evaluate = (
    candidate: DiagramPlacementCandidate,
    sourceCache?: ReadonlyMap<string, EdgeSolveCacheEntry>
  ) => {
    const positions = centerAndSnapLayout(input.nodes, candidate.positions)
    const signature = canonicalPositionSignature(positions)
    const evaluation =
      evaluationBySignature.get(signature) ??
      (() => {
        onExactEvaluation?.()
        return evaluateLayoutCandidate(
          input,
          positions,
          edgeLabels,
          sourceCache
        )
      })()
    evaluationBySignature.set(signature, evaluation)
    const scored = {
      candidate: candidate.id,
      positions,
      score: evaluation.score,
    }
    const compareEvaluations = (
      left: Readonly<{ score: readonly number[]; signature: string }>,
      right: Readonly<{ score: readonly number[]; signature: string }>
    ) =>
      compareMetricValues(left.score, right.score) ||
      (left.signature < right.signature
        ? -1
        : left.signature > right.signature
          ? 1
          : 0)
    const generatedEvaluation = {
      candidate,
      scored,
      score: evaluation.score,
      metrics: evaluation.metrics,
      signature: evaluation.signature,
      solveCache: evaluation.solveCache,
    }
    if (
      !bestGenerated ||
      compareEvaluations(generatedEvaluation, bestGenerated) < 0
    )
      bestGenerated = generatedEvaluation
    if (
      isMaterialLayoutImprovement(
        baselineEvaluation.metrics,
        evaluation.metrics
      ) &&
      compareEvaluations(generatedEvaluation, {
        score: bestAccepted.scored.score,
        signature: bestAccepted.signature,
      }) < 0
    )
      bestAccepted = {
        scored,
        signature: evaluation.signature,
      }
  }

  const visibleCount = input.nodes.filter((node) => !node.hidden).length
  const edgeCount = input.edges.length
  const budget = getLayoutSolveBudget(visibleCount, edgeCount)
  for (const candidate of shortlistPlacementCandidates(
    generate(input),
    Math.max(0, budget.maxExactEvaluations - 1)
  ))
    evaluate(candidate)

  // Feed the real routed objective back into node ordering. Adjacent swaps are
  // the highest-value discrete neighborhood in a layered drawing; evaluate a
  // bounded, evenly distributed subset so runtime scales predictably.
  let remainingEvaluations =
    budget.localSearchRounds > 0
      ? Math.max(0, budget.maxExactEvaluations - evaluationBySignature.size)
      : 0
  for (
    let round = 0;
    round < budget.localSearchRounds &&
    remainingEvaluations > 0 &&
    bestGenerated;
    round++
  ) {
    const sourceEvaluation = bestGenerated
    const source = sourceEvaluation.candidate
    const proposals = source.layers.flatMap((layer, layerIndex) =>
      Array.from({ length: Math.max(0, layer.length - 1) }, (_, leftIndex) =>
        swapAdjacentLayerNodes(source, input.nodes, layerIndex, leftIndex)
      )
    )
    if (proposals.length === 0) break
    const selected =
      proposals.length <= remainingEvaluations
        ? proposals
        : Array.from({ length: remainingEvaluations }, (_, index) => {
            const proposalIndex = Math.round(
              (index * (proposals.length - 1)) /
                Math.max(1, remainingEvaluations - 1)
            )
            return proposals[proposalIndex]
          })
    remainingEvaluations -= selected.length
    const before = bestGenerated
    for (const proposal of selected)
      evaluate(proposal, sourceEvaluation.solveCache)
    if (bestGenerated === before) break
  }

  return bestAccepted.scored
}
