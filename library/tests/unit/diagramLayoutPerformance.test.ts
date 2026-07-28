import { describe, expect, it } from "vitest"
import { Position } from "@xyflow/react"
import {
  scoreLayoutCandidate,
  solveDiagramLayout,
} from "@/layout/candidateSolver"
import { generatePlacementCandidates } from "@/layout/placementGenerator"
import type { DiagramLayoutSnapshot } from "@/layout/model"
import type {
  SerializedInternalSolverNode,
  SerializedSolverInput,
  SerializedSolverNode,
} from "@/utils/geometry/edgeGeometryWorkerProtocol"
import { getPerfCounters } from "@/sync/perfCounters"
import { getDistributedHandleOffsets } from "@/utils/edgeUtils"

// Exact geometry from the diagram attached to GitHub issue #128. Rebuilding
// the rendered 36-handle sets keeps the regression fixture compact while
// preserving the router's real candidate-anchor search space.
const rawNodes = [
  {
    id: "b88b8ad7-80db-4689-b3eb-d77503b259c6",
    type: "package",
    position: { x: 110, y: 375 },
    width: 160,
    height: 120,
  },
  {
    id: "d80adab4-465d-4084-b2bf-83450dfe7415",
    type: "class",
    position: { x: 380, y: 385 },
    width: 160,
    height: 100,
  },
  {
    id: "db57b6ce-d6c4-4468-ba58-a5739cdab01f",
    type: "class",
    position: { x: 85, y: 580 },
    width: 160,
    height: 140,
  },
  {
    id: "e5b289cf-badb-4e55-a780-d33a442896a8",
    type: "package",
    position: { x: 135, y: 175 },
    width: 160,
    height: 120,
  },
  {
    id: "8d5e595d-443e-43bb-9ff2-a8186dc5d321",
    type: "class",
    position: { x: -190, y: 435 },
    width: 160,
    height: 100,
  },
] satisfies SerializedSolverNode[]

const internalNode = (
  node: SerializedSolverNode
): SerializedInternalSolverNode => ({
  ...node,
  measured: { width: node.width!, height: node.height! },
  positionAbsolute: { ...node.position },
  handleBounds: {
    source: fixtureHandles(node),
    target: null,
  },
})

const fixtureHandles = (node: SerializedSolverNode) => {
  const width = node.width!
  const height = node.height!
  const xs = getDistributedHandleOffsets(width).map((value) => value - 4)
  const ys = getDistributedHandleOffsets(height).map((value) => value - 4)
  const topY = node.type === "package" ? 6 : -4
  const side = (
    ids: readonly string[],
    position: Position,
    coordinates: (index: number) => { x: number; y: number }
  ) =>
    ids.map((id, index) => ({
      id,
      type: "source" as const,
      position,
      ...coordinates(index),
      width: 8,
      height: 8,
    }))

  return [
    ...side(
      [
        "top-left",
        "top-between-left-mid-left",
        "top-mid-left",
        "top-between-mid-left-center",
        "top",
        "top-between-center-mid-right",
        "top-mid-right",
        "top-between-mid-right-right",
        "top-right",
      ],
      Position.Top,
      (index) => ({ x: xs[index], y: topY })
    ),
    ...side(
      [
        "right-top",
        "right-between-top-mid-top",
        "right-mid-top",
        "right-between-mid-top-center",
        "right",
        "right-between-center-mid-bottom",
        "right-mid-bottom",
        "right-between-mid-bottom-bottom",
        "right-bottom",
      ],
      Position.Right,
      (index) => ({ x: width - 4, y: ys[index] })
    ),
    ...side(
      [
        "bottom-right",
        "bottom-between-right-mid-right",
        "bottom-mid-right",
        "bottom-between-mid-right-center",
        "bottom",
        "bottom-between-center-mid-left",
        "bottom-mid-left",
        "bottom-between-mid-left-left",
        "bottom-left",
      ],
      Position.Bottom,
      (index) => ({ x: xs[8 - index], y: height - 4 })
    ),
    ...side(
      [
        "left-bottom",
        "left-between-bottom-mid-bottom",
        "left-mid-bottom",
        "left-between-mid-bottom-center",
        "left",
        "left-between-center-mid-top",
        "left-mid-top",
        "left-between-mid-top-top",
        "left-top",
      ],
      Position.Left,
      (index) => ({ x: -4, y: ys[8 - index] })
    ),
  ]
}

const fixtureSnapshot = (): DiagramLayoutSnapshot => {
  const nodes = rawNodes.map((node) => ({
    ...node,
    measured: { width: node.width, height: node.height },
  }))
  const center = "b88b8ad7-80db-4689-b3eb-d77503b259c6"
  const solver: SerializedSolverInput = {
    nodes,
    nodeLookup: nodes.map((node) => [node.id, internalNode(node)]),
    connectionMode: "loose",
    edges: [
      {
        id: "194c5b4b-be40-41e7-9f6c-402835b7ee16",
        type: "ClassUnidirectional",
        source: center,
        target: "d80adab4-465d-4084-b2bf-83450dfe7415",
        sourceHandle: "bottom",
        targetHandle: "top-between-mid-left-center",
        data: { points: [] },
      },
      {
        id: "f59d295f-6d5a-4d12-a5ad-72f4488b58af",
        type: "ClassUnidirectional",
        source: "db57b6ce-d6c4-4468-ba58-a5739cdab01f",
        target: center,
        sourceHandle: "right",
        targetHandle: "left-mid-bottom",
        data: { points: [] },
      },
      {
        id: "1f2876e1-d2bb-443a-8845-961b059bf011",
        type: "ClassUnidirectional",
        source: "e5b289cf-badb-4e55-a780-d33a442896a8",
        target: center,
        sourceHandle: "bottom",
        targetHandle: "top-mid-left",
        data: { points: [] },
      },
      {
        id: "e107a3a3-759d-4d50-9a45-bfb65233262c",
        type: "ClassUnidirectional",
        source: "8d5e595d-443e-43bb-9ff2-a8186dc5d321",
        target: center,
        sourceHandle: "top",
        targetHandle: "bottom",
        data: { points: [] },
      },
    ],
    straightPathTypes: [],
    straightHookTypes: [],
  }
  return { solver, edgeLabels: {} }
}

describe("diagram layout performance regressions", () => {
  it("compacts the reported class star without crossings or bends", async () => {
    const snapshot = fixtureSnapshot()
    const currentPositions = Object.fromEntries(
      snapshot.solver.nodes.map((node) => [node.id, node.position])
    )
    const baselineScore = scoreLayoutCandidate(snapshot, currentPositions)
    const before = { ...getPerfCounters()! }
    let evaluations = 0
    const result = await solveDiagramLayout(
      snapshot,
      generatePlacementCandidates,
      () => evaluations++
    )
    const after = getPerfCounters()!
    expect(result.candidate).toBe("radial-structures")
    // Named objective tiers: crossings, weighted route cost, bends, and area.
    expect(result.score[4]).toBe(0)
    expect(result.score[13]).toBeLessThan(baselineScore[13] * 0.5)
    expect(result.score[15]).toBe(0)
    expect(result.score[26]).toBeLessThan(baselineScore[26] * 0.65)
    expect(evaluations).toBeLessThanOrEqual(6)
    expect(after.routerSearches - before.routerSearches).toBeLessThanOrEqual(
      125
    )
    expect(after.routerExpansions - before.routerExpansions).toBeLessThan(
      40_000
    )
    expect(after.routeScoreRuns - before.routeScoreRuns).toBeLessThanOrEqual(
      150
    )
    expect(after.routeScorePairs - before.routeScorePairs).toBeLessThanOrEqual(
      200
    )
  })
})
